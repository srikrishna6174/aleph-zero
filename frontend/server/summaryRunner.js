import { inspectVideoUrl } from "./youtubeFeed.js";

const SYSTEM_PROMPT = `You are an expert YouTube video summarizer. Produce a clear, well-structured summary based on the transcript or metadata provided.

Use exact Markdown section headings:
## TL;DR
A 1-2 sentence executive summary.

## Key Points
- Bulleted list of main arguments/topics covered (use **bold** lead-ins where helpful)

## Details
A concise narrative summary expanding on the key points (2-4 short paragraphs).

## Notable Quotes
> Include 1-2 memorable quotes if applicable (omit if none).

Discard sponsor reads, like/subscribe reminders, and filler. Keep total length 200-450 words.`;

const FALLBACK_MODELS = [
  "gemini-3.6-flash",
  "gemini-flash-lite-latest",
  "gemini-3.5-flash-lite",
  "gemini-3-flash-preview",
  "gemini-3.5-flash",
  "gemini-3.7-flash",
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.1-pro-preview",
  "gemini-4-hydrogen",
  "gemma-4-26b-a4b-it",
  "gemma-4-31b-it",
  "gemini-3.1-flash-lite-preview",
];

function compactPromptForLimit(prompt, maxChars = 34000) {
  if (prompt.length <= maxChars) return prompt;
  const head = Math.floor(maxChars * 0.45);
  const midLen = Math.floor(maxChars * 0.27);
  const tail = maxChars - head - midLen;
  const midStart = Math.max(head, Math.floor((prompt.length - midLen) / 2));
  return (
    prompt.slice(0, head) +
    "\n\n[...middle transcript excerpted for model length limit...]\n\n" +
    prompt.slice(midStart, midStart + midLen) +
    "\n\n[...final transcript excerpted for model length limit...]\n\n" +
    prompt.slice(-tail)
  );
}

const YT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  Cookie: "CONSENT=YES+cb.20210328-17-p0.en+FX+417",
};

function decodeHtml(str = "") {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function extractJsonArrayAfter(text, marker) {
  const idx = text.indexOf(marker);
  if (idx === -1) return null;
  const start = text.indexOf("[", idx + marker.length);
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === "[") {
      depth++;
    } else if (ch === "]") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

const INNERTUBE_CLIENTS = [
  {
    userAgent:
      "com.google.android.youtube/20.10.38 (Linux; U; Android 14) gzip",
    context: {
      client: {
        clientName: "ANDROID",
        clientVersion: "20.10.38",
      },
    },
  },
  {
    userAgent:
      "com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3_1 like Mac OS X;)",
    context: {
      client: {
        clientName: "IOS",
        clientVersion: "20.10.4",
        deviceMake: "Apple",
        deviceModel: "iPhone16,2",
        osName: "iOS",
        osVersion: "18.3.1",
      },
    },
  },
];

async function getCaptionTracksViaInnertube(videoId, apiKey = "") {
  const endpoint = apiKey
    ? `https://www.youtube.com/youtubei/v1/player?key=${encodeURIComponent(apiKey)}&prettyPrint=false`
    : "https://www.youtube.com/youtubei/v1/player?prettyPrint=false";

  for (const clientSpec of INNERTUBE_CLIENTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": clientSpec.userAgent,
        },
        signal: AbortSignal.timeout(7000),
        body: JSON.stringify({
          context: clientSpec.context,
          videoId,
        }),
      });
      if (!res.ok) continue;
      const data = await res.json().catch(() => null);
      const tracks =
        data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (Array.isArray(tracks) && tracks.length > 0) {
        return { tracks, userAgent: clientSpec.userAgent };
      }
    } catch {
      // try next client
    }
  }
  return null;
}

async function fetchTranscriptFromWatch(videoId) {
  try {
    let resolved = await getCaptionTracksViaInnertube(videoId);
    let tracks = resolved?.tracks || null;
    let subUserAgent = resolved?.userAgent || YT_HEADERS["User-Agent"];

    if (!tracks) {
      const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: YT_HEADERS,
        signal: AbortSignal.timeout(7000),
      });
      if (!res.ok) return null;
      const html = await res.text();
      tracks = extractJsonArrayAfter(html, '"captionTracks":');
      subUserAgent = YT_HEADERS["User-Agent"];

      if (!tracks) {
        const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":\s*"([a-zA-Z0-9_-]+)"/);
        if (apiKeyMatch?.[1]) {
          resolved = await getCaptionTracksViaInnertube(videoId, apiKeyMatch[1]);
          tracks = resolved?.tracks || null;
          if (resolved?.userAgent) subUserAgent = resolved.userAgent;
        }
      }
    }
    if (!Array.isArray(tracks) || tracks.length === 0) return null;

    const preferred =
      tracks.find((t) => /^en(-|$)/i.test(t.languageCode) && t.kind !== "asr") ||
      tracks.find((t) => /^en(-|$)/i.test(t.languageCode)) ||
      tracks[0];

    if (!preferred?.baseUrl) return null;

    let body = "";
    const subHeaders = {
      "User-Agent": subUserAgent,
      "Accept-Language": "en-US,en;q=0.9",
    };
    for (const candidateUrl of [
      `${preferred.baseUrl}&fmt=json3`,
      preferred.baseUrl,
    ]) {
      const subRes = await fetch(candidateUrl, {
        headers: subHeaders,
        signal: AbortSignal.timeout(7000),
      }).catch(() => null);
      if (subRes && subRes.ok) {
        const text = await subRes.text();
        if (text && text.trim()) {
          body = text;
          break;
        }
      }
    }
    if (!body) return null;

    if (body.trim().startsWith("{")) {
      const json3 = JSON.parse(body);
      const segments = [];
      for (const ev of json3.events || []) {
        if (!ev.segs) continue;
        const text = ev.segs
          .map((s) => s.utf8 || "")
          .join("")
          .replace(/\n/g, " ")
          .replace(/\[[^\]]*\]/g, "")
          .trim();
        if (text) segments.push(text);
      }
      const joined = segments.join(" ").replace(/\s+/g, " ").trim();
      return joined || null;
    }

    // XML (<text> and timedtext3 <p>) transcript fallback
    const xmlTexts = Array.from(
      body.matchAll(/<(?:text|p)[^>]*>([\s\S]*?)<\/(?:text|p)>/g),
    )
      .map((m) =>
        decodeHtml(m[1].replace(/<[^>]+>/g, " "))
          .replace(/\s+/g, " ")
          .trim(),
      )
      .filter(Boolean);
    return xmlTexts.join(" ") || null;
  } catch {
    return null;
  }
}

async function callGeminiWithFallback(geminiKey, prompt, configuredModel) {
  const models = [];
  for (const m of [configuredModel, ...FALLBACK_MODELS]) {
    if (m && !models.includes(m)) models.push(m);
  }

  let lastError = "No Gemini models succeeded";
  const unavailable = new Set();
  const passes =
    prompt.length > 45000 ? [prompt, compactPromptForLimit(prompt, 45000)] : [prompt];

  for (const passPrompt of passes) {
    for (const model of models) {
      if (unavailable.has(model)) continue;

      const isGemma = model.startsWith("gemma-");
      const effectivePrompt = isGemma
        ? compactPromptForLimit(passPrompt, 34000)
        : passPrompt;

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const requestBody = isGemma
            ? {
                contents: [
                  {
                    role: "user",
                    parts: [{ text: `${SYSTEM_PROMPT}\n\n${effectivePrompt}` }],
                  },
                ],
                generationConfig: {
                  temperature: 0.3,
                  maxOutputTokens: 4096,
                },
              }
            : {
                systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
                contents: [{ role: "user", parts: [{ text: effectivePrompt }] }],
                generationConfig: {
                  temperature: 0.3,
                  maxOutputTokens: 2048,
                },
              };

          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(geminiKey)}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal: AbortSignal.timeout(9000),
              body: JSON.stringify(requestBody),
            },
          );

          const data = await res.json().catch(() => ({}));
          if (res.ok) {
            const text =
              data?.candidates?.[0]?.content?.parts
                ?.map((p) => p.text || "")
                .join("")
                .trim() || "";
            if (text) return text;
            lastError = `Empty response from ${model}`;
            break;
          }

          const status = res.status;
          const errMsg = data?.error?.message || `HTTP ${status}`;
          lastError = `${model}: ${errMsg}`;

          if (status === 404 || status === 429) {
            unavailable.add(model);
            break; // skip exhausted/deprecated model for remaining passes
          }
          if (status >= 500 && attempt < 2) {
            await new Promise((r) => setTimeout(r, 1000));
            continue;
          }
          break;
        } catch (err) {
          lastError = err?.message || String(err);
          const isTimeout =
            err?.name === "TimeoutError" || err?.name === "AbortError";
          if (!isTimeout && attempt < 2) {
            await new Promise((r) => setTimeout(r, 1000));
            continue;
          }
          break;
        }
      }
    }
  }

  throw new Error(`Summarization failed: ${lastError}`);
}

async function appwriteRequest({
  endpoint,
  projectId,
  apiKey,
  jwt,
  method = "GET",
  path,
  body,
}) {
  const headers = {
    "Content-Type": "application/json",
    "X-Appwrite-Project": projectId,
  };
  if (apiKey) headers["X-Appwrite-Key"] = apiKey;
  else if (jwt) headers["X-Appwrite-JWT"] = jwt;

  const res = await fetch(`${endpoint}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || `Appwrite HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function summarizeVideosInNode({
  videos,
  geminiKey,
  geminiModel = "gemini-3.6-flash",
  endpoint,
  projectId,
  databaseId,
  videosTableId = "videos",
  apiKey = "",
  jwt = "",
}) {
  const startedAt = Date.now();
  const MAX_BUDGET_MS = 48000;

  async function processSingleVideo(rawVideo) {
    let video = { ...rawVideo };
    const videoId = video.videoId || video.video_id;
    if (!videoId) return null;

    let docId = video.docId || video.$id || "";

    if (!docId) {
      try {
        const q = encodeURIComponent(
          JSON.stringify({
            method: "equal",
            attribute: "video_id",
            values: [videoId],
          }),
        );
        const listRes = await appwriteRequest({
          endpoint,
          projectId,
          apiKey,
          jwt,
          path: `/tablesdb/${databaseId}/tables/${videosTableId}/rows?queries[]=${q}`,
        });
        docId = listRes?.rows?.[0]?.$id || "";
      } catch {
        // fallback if query format varies
      }
    }

    if (Date.now() - startedAt > MAX_BUDGET_MS) {
      return {
        videoId,
        docId,
        status: "pending",
      };
    }

    try {
      if (docId) {
        await appwriteRequest({
          endpoint,
          projectId,
          apiKey,
          jwt,
          method: "PATCH",
          path: `/tablesdb/${databaseId}/tables/${videosTableId}/rows/${docId}`,
          body: { data: { status: "processing", error_message: "" } },
        });
      }

      const transcript = await fetchTranscriptFromWatch(videoId);
      if (!transcript && (!video.description || !video.title)) {
        try {
          const inspected = await inspectVideoUrl(videoId);
          video = {
            ...inspected,
            ...video,
            videoId,
            title: video.title || inspected.title,
            description: video.description || inspected.description || "",
          };
        } catch {
          // continue with available metadata
        }
      }

      let prompt;
      if (transcript) {
        prompt = `Video Title: "${video.title || videoId}"\n\nTranscript:\n${transcript.slice(0, 150000)}`;
      } else {
        prompt = `No transcript is available for this video. Start the ## TL;DR with "(No transcript available)" and summarize accurately using only this metadata:\n\nVideo Title: ${video.title || videoId}\nDescription:\n${video.description || "(not available)"}`;
      }

      const summary = await callGeminiWithFallback(
        geminiKey,
        prompt,
        geminiModel,
      );

      if (docId) {
        await appwriteRequest({
          endpoint,
          projectId,
          apiKey,
          jwt,
          method: "PATCH",
          path: `/tablesdb/${databaseId}/tables/${videosTableId}/rows/${docId}`,
          body: {
            data: {
              ai_summary: summary,
              status: "completed",
              error_message: "",
            },
          },
        });
      }

      return {
        videoId,
        docId,
        status: "completed",
        ai_summary: summary,
      };
    } catch (err) {
      const errorMessage = (err?.message || "Failed to summarize").slice(
        0,
        1000,
      );
      if (docId) {
        await appwriteRequest({
          endpoint,
          projectId,
          apiKey,
          jwt,
          method: "PATCH",
          path: `/tablesdb/${databaseId}/tables/${videosTableId}/rows/${docId}`,
          body: {
            data: {
              status: "failed",
              error_message: errorMessage,
            },
          },
        }).catch(() => {});
      }
      return { videoId, docId, status: "failed", error: errorMessage };
    }
  }

  const results = [];
  const CONCURRENCY = 3;
  for (let i = 0; i < videos.length; i += CONCURRENCY) {
    const batch = videos.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(processSingleVideo));
    for (const res of batchResults) {
      if (res) results.push(res);
    }
  }

  return results;
}
