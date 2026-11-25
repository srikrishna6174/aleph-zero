const YT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  Cookie: "CONSENT=YES+cb.20210328-17-p0.en+FX+417",
};

function decodeXmlEntities(str = "") {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function getTagValue(block, tagName) {
  const escaped = tagName.replace(":", "\\:");
  const match = block.match(
    new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`, "i"),
  );
  return match ? decodeXmlEntities(match[1].trim()) : "";
}

function getAttrValue(block, tagName, attrName) {
  const escaped = tagName.replace(":", "\\:");
  const match = block.match(
    new RegExp(`<${escaped}[^>]*\\s${attrName}=["']([^"']+)["']`, "i"),
  );
  return match ? decodeXmlEntities(match[1].trim()) : "";
}

export function extractVideoId(raw = "") {
  const match = raw.match(
    /(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|live\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i,
  );
  if (match) return match[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw.trim())) return raw.trim();
  return null;
}

export async function fetchChannelFeedVideos(channelId) {
  if (!/^UC[\w-]{22}$/.test(channelId)) {
    throw new Error("Invalid YouTube Channel ID.");
  }

  const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const res = await fetch(rssUrl, { headers: YT_HEADERS });
  if (!res.ok) {
    throw new Error(`Failed to fetch YouTube RSS feed (HTTP ${res.status}).`);
  }

  const xml = await res.text();
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/gi) || [];

  return entries
    .map((entry) => {
      const videoId = getTagValue(entry, "yt:videoId");
      const title = getTagValue(entry, "title") || "Untitled";
      const publishedAt =
        getTagValue(entry, "published") || new Date().toISOString();
      const linkHref = getAttrValue(entry, "link", "href");
      const thumbnailUrl =
        getAttrValue(entry, "media:thumbnail", "url") ||
        (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "");
      const description = getTagValue(entry, "media:description").slice(
        0,
        3000,
      );

      return {
        videoId,
        channelId,
        title,
        publishedAt,
        thumbnailUrl,
        description,
        isShort: linkHref.includes("/shorts/"),
      };
    })
    .filter((v) => Boolean(v.videoId));
}

export async function inspectVideoUrl(videoInput) {
  const videoId = extractVideoId(videoInput);
  if (!videoId) {
    throw new Error("Could not extract a valid 11-character YouTube video ID.");
  }

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const res = await fetch(watchUrl, { headers: YT_HEADERS, redirect: "follow" });
  if (!res.ok) {
    throw new Error(`YouTube returned HTTP ${res.status} for that video.`);
  }

  const html = await res.text();
  const channelId =
    html.match(/"(?:externalId|channelId|browseId)":"(UC[\w-]{22})"/)?.[1] ||
    html.match(/youtube\.com\/channel\/(UC[\w-]{22})/)?.[1] ||
    "";

  let title =
    decodeXmlEntities(
      html.match(/<meta name="title" content="([^"]+)"/)?.[1] ||
        html.match(/<meta property="og:title" content="([^"]+)"/)?.[1] ||
        "",
    ) || `Video ${videoId}`;

  let channelName = "";
  const ownerRaw =
    html.match(/"ownerChannelName":"((?:[^"\\]|\\.)+)"/)?.[1] ||
    html.match(/"author":"((?:[^"\\]|\\.)+)"/)?.[1];
  if (ownerRaw) {
    try {
      channelName = JSON.parse(`"${ownerRaw}"`);
    } catch {
      channelName = ownerRaw;
    }
  }

  let description = "";
  const descRaw = html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/)?.[1];
  if (descRaw) {
    try {
      description = JSON.parse(`"${descRaw}"`).slice(0, 3000);
    } catch {
      description = descRaw.slice(0, 3000);
    }
  }

  const publishedAt =
    html.match(/"publishDate":"([^"]+)"/)?.[1] ||
    html.match(/itemprop="datePublished" content="([^"]+)"/)?.[1] ||
    new Date().toISOString();

  return {
    videoId,
    channelId,
    channelName: channelName || channelId,
    title,
    publishedAt: publishedAt.includes("T")
      ? publishedAt
      : `${publishedAt}T00:00:00Z`,
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    description,
    isShort: false,
  };
}
