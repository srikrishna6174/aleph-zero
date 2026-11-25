const YT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  Cookie: "CONSENT=YES+cb.20210328-17-p0.en+FX+417",
};

function decodeHtmlEntities(str = "") {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractVideoIdFromInput(raw) {
  const m = raw.match(
    /(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|live\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i,
  );
  return m ? m[1] : null;
}

function buildTargetUrl(rawInput) {
  const trimmed = rawInput.trim().replace(/\/+$/, "");
  if (!trimmed) return null;

  if (/^UC[\w-]{22}$/.test(trimmed)) {
    return {
      url: `https://www.youtube.com/channel/${trimmed}`,
      knownChannelId: trimmed,
      isVideo: false,
    };
  }

  const videoId = extractVideoIdFromInput(trimmed);
  if (videoId) {
    return {
      url: `https://www.youtube.com/watch?v=${videoId}`,
      knownChannelId: null,
      isVideo: true,
    };
  }

  const withoutProto = trimmed
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "");

  const channelMatch = withoutProto.match(
    /youtube\.com\/channel\/(UC[\w-]{22})/i,
  );
  if (channelMatch) {
    return {
      url: `https://www.youtube.com/channel/${channelMatch[1]}`,
      knownChannelId: channelMatch[1],
      isVideo: false,
    };
  }

  if (/^(?:m\.)?youtube\.com\//i.test(withoutProto)) {
    const cleaned = withoutProto
      .split("?")[0]
      .replace(
        /\/(videos|shorts|streams|live|playlists|community|about|featured)$/i,
        "",
      );
    return {
      url: `https://www.${cleaned.replace(/^m\./i, "")}`,
      knownChannelId: null,
      isVideo: false,
    };
  }

  const handle = trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
  return {
    url: `https://www.youtube.com/${handle}`,
    knownChannelId: null,
    isVideo: false,
  };
}

export async function resolveYouTubeChannel(rawInput) {
  const target = buildTargetUrl(rawInput);
  if (!target) {
    throw new Error("Empty YouTube channel input.");
  }

  const res = await fetch(target.url, {
    headers: YT_HEADERS,
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`YouTube returned HTTP ${res.status} for that channel or URL.`);
  }

  const html = await res.text();

  const channelId =
    target.knownChannelId ||
    html.match(/"(?:externalId|channelId|browseId)":"(UC[\w-]{22})"/)?.[1] ||
    html.match(/youtube\.com\/channel\/(UC[\w-]{22})/)?.[1] ||
    null;

  if (!channelId) {
    throw new Error(
      "Could not detect a YouTube channel ID from that URL or handle.",
    );
  }

  let name = "";
  let thumbnailUrl = "";

  if (target.isVideo) {
    const ownerMatch =
      html.match(/"ownerChannelName":"((?:[^"\\]|\\.)+)"/)?.[1] ||
      html.match(/"author":"((?:[^"\\]|\\.)+)"/)?.[1];
    if (ownerMatch) {
      try {
        name = JSON.parse(`"${ownerMatch}"`);
      } catch {
        name = ownerMatch;
      }
    }
    try {
      const chRes = await fetch(`https://www.youtube.com/channel/${channelId}`, {
        headers: YT_HEADERS,
        redirect: "follow",
      });
      if (chRes.ok) {
        const chHtml = await chRes.text();
        if (!name) {
          name = decodeHtmlEntities(
            chHtml.match(/<meta property="og:title" content="([^"]+)"/)?.[1] ||
              "",
          );
        }
        thumbnailUrl =
          chHtml.match(/<meta property="og:image" content="([^"]+)"/)?.[1] ||
          "";
      }
    } catch {
      // ignore optional channel avatar lookup error
    }
  } else {
    name = decodeHtmlEntities(
      html.match(/<meta property="og:title" content="([^"]+)"/)?.[1] ||
        html
          .match(/<title>([^<]+)<\/title>/)?.[1]
          ?.replace(/\s*-\s*YouTube$/i, "") ||
        "",
    );
    thumbnailUrl =
      html.match(/<meta property="og:image" content="([^"]+)"/)?.[1] || "";
  }

  return {
    channelId,
    name: name.trim() || channelId,
    thumbnailUrl: thumbnailUrl.trim(),
  };
}
