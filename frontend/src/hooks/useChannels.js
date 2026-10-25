/**
 * useChannels Hook
 * =================
 * Manages channel subscriptions using the TablesDB API.
 */

import { useState, useEffect, useCallback } from "react";
import { ID, Query } from "appwrite";
import {
  tablesDB,
  DATABASE_ID,
  CHANNELS_TABLE_ID,
  SUBSCRIPTIONS_TABLE_ID,
} from "../lib/appwrite";
import { useAuth } from "./useAuth";

// Reserved YouTube URL path segments that are NOT channel handles
const RESERVED_SEGMENTS = new Set([
  "watch", "playlist", "feed", "feeds", "channel", "c", "user",
  "results", "shorts", "live", "clip", "hashtag", "account", "premium",
]);

/**
 * Parses any YouTube channel input into a normalized descriptor.
 * Handles:
 *   - UC… raw channel IDs
 *   - Full URLs: https://www.youtube.com/... (any format)
 *   - @handle, /c/handle, /user/handle, /channel/UC…, /customname
 *   - Bare handles with or without @
 */
function parseChannelInput(raw) {
  const trimmed = raw.trim().replace(/\/+$/, "");

  // 1. Raw UC… channel ID (exact 24-char)
  if (/^UC[\w-]{22}$/.test(trimmed)) {
    return { channelId: trimmed, type: "id" };
  }

  // Strip protocol + www so the rest of the regexes work uniformly
  const withoutProto = trimmed
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "");

  // 2. youtube.com/channel/UC…
  const channelPathMatch = withoutProto.match(/youtube\.com\/channel\/(UC[\w-]{22})/i);
  if (channelPathMatch) {
    return { channelId: channelPathMatch[1], type: "id" };
  }

  // 3. youtube.com/@handle
  const atHandleMatch = withoutProto.match(/youtube\.com\/@([\w.-]+)/i);
  if (atHandleMatch) {
    return { handle: atHandleMatch[1], handleRaw: `@${atHandleMatch[1]}`, type: "handle" };
  }

  // 4. youtube.com/c/handle  OR  youtube.com/user/handle
  const cUserMatch = withoutProto.match(/youtube\.com\/(?:c|user)\/([\w.-]+)/i);
  if (cUserMatch) {
    return { handle: cUserMatch[1], handleRaw: cUserMatch[1], type: "handle" };
  }

  // 5. youtube.com/customname  (legacy custom URL, e.g. /gothamchess)
  const customMatch = withoutProto.match(/youtube\.com\/([\w.-]+)/i);
  if (customMatch) {
    const seg = customMatch[1];
    if (!RESERVED_SEGMENTS.has(seg.toLowerCase())) {
      return { handle: seg, handleRaw: seg, type: "handle" };
    }
  }

  // 6. Bare @handle (e.g. "@gothamchess")
  if (trimmed.startsWith("@") && trimmed.length > 1) {
    return { handle: trimmed.slice(1), handleRaw: trimmed, type: "handle" };
  }

  // 7. Bare name with no slashes and no domain (e.g. "gothamchess")
  if (!trimmed.includes("/") && !withoutProto.includes("youtube.com") && trimmed.length > 0) {
    return { handle: trimmed, handleRaw: trimmed, type: "handle" };
  }

  return {
    error: "Invalid input. Provide a YouTube channel URL, @handle, or UC… channel ID.",
    type: "invalid",
  };
}

/**
 * Resolve a handle/custom-URL to a { channelId, channelName } via YouTube Data API.
 * Tries forHandle first (works for @-handles), then falls back to search (covers legacy custom URLs).
 */
async function resolveHandleViaAPI(handle, handleRaw, apiKey) {
  // Attempt 1: forHandle — works for @handles and sometimes custom URLs
  const atHandle = handle.startsWith("@") ? handle : `@${handle}`;
  const handleUrl = `https://www.googleapis.com/youtube/v3/channels?part=id,snippet&forHandle=${encodeURIComponent(atHandle)}&key=${apiKey}`;
  let res = await fetch(handleUrl);
  let data = await res.json();

  if (data.items && data.items.length > 0) {
    return {
      channelId: data.items[0].id,
      channelName: data.items[0].snippet?.title || data.items[0].id,
    };
  }

  // Attempt 2: search — covers legacy custom URLs like /gothamchess
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(handleRaw)}&maxResults=1&key=${apiKey}`;
  res = await fetch(searchUrl);
  data = await res.json();

  if (data.items && data.items.length > 0) {
    const item = data.items[0];
    return {
      channelId: item.snippet.channelId,
      channelName: item.snippet.channelTitle || item.snippet.channelId,
    };
  }

  throw new Error(
    `Could not find a YouTube channel for "${handleRaw}". Please check the URL or handle and try again.`
  );
}

export function useChannels() {
  const { user } = useAuth();
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchChannels = useCallback(async () => {
    if (!user) {
      setChannels([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Get user's subscriptions
      const subsResponse = await tablesDB.listRows(
        DATABASE_ID,
        SUBSCRIPTIONS_TABLE_ID,
        [Query.equal("user_id", user.$id), Query.limit(100)]
      );

      const channelIds = subsResponse.rows
        .map((s) => s.channel_id ?? s.data?.channel_id)
        .filter(Boolean);

      if (channelIds.length === 0) {
        setChannels([]);
        return;
      }

      // 2. Fetch channel details
      const channelsResponse = await tablesDB.listRows(
        DATABASE_ID,
        CHANNELS_TABLE_ID,
        [Query.equal("channel_id", channelIds), Query.limit(100)]
      );

      setChannels(channelsResponse.rows);
    } catch (err) {
      console.error("Error fetching channels:", err);
      setError(err?.message || "Failed to load channels");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const addChannel = useCallback(
    async (input) => {
      if (!user) throw new Error("Must be logged in");

      setError(null);

      const parsed = parseChannelInput(input);
      if (parsed.type === "invalid") {
        setError(parsed.error);
        throw new Error(parsed.error);
      }

      let channelId = parsed.channelId;
      let resolvedName = null; // set during handle resolution from YouTube API

      // ── Resolve handle → channel ID + name via YouTube Data API ─────
      if (parsed.type === "handle") {
        const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
        if (!apiKey) {
          const msg =
            "YouTube API key is missing. Cannot resolve handles or custom URLs. " +
            "Please add VITE_YOUTUBE_API_KEY to your .env file or use a UC… channel ID directly.";
          setError(msg);
          throw new Error(msg);
        }

        setLoading(true);
        try {
          const resolved = await resolveHandleViaAPI(parsed.handle, parsed.handleRaw ?? parsed.handle, apiKey);
          channelId = resolved.channelId;
          resolvedName = resolved.channelName;
        } catch (err) {
          const msg = err.message || "Failed to resolve channel via YouTube API.";
          setError(msg);
          setLoading(false);
          throw new Error(msg);
        }
      }

      const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

      try {
        setLoading(true);

        // 1. Check if the user is already subscribed (before creating anything)
        const existingSubs = await tablesDB.listRows(
          DATABASE_ID,
          SUBSCRIPTIONS_TABLE_ID,
          [
            Query.equal("user_id", user.$id),
            Query.equal("channel_id", channelId),
            Query.limit(1),
          ]
        );

        if (existingSubs.rows.length > 0) {
          const msg = "You are already subscribed to this channel.";
          setError(msg);
          throw new Error(msg); // <-- must throw so the form shows an error
        }

        // 2. Upsert channel record
        let channelRow;
        const existingChannels = await tablesDB.listRows(
          DATABASE_ID,
          CHANNELS_TABLE_ID,
          [Query.equal("channel_id", channelId), Query.limit(1)]
        );

        if (existingChannels.rows.length > 0) {
          channelRow = existingChannels.rows[0];
        } else {
          // Use API-resolved name first; RSS fetch likely fails due to CORS
          let channelName = resolvedName;
          if (!channelName) {
            // Try RSS as last resort (may fail silently due to CORS)
            try {
              const rssRes = await fetch(rssUrl);
              if (rssRes.ok) {
                const text = await rssRes.text();
                const xml = new DOMParser().parseFromString(text, "text/xml");
                const titleEl = xml.querySelector("feed > title");
                channelName = titleEl?.textContent?.trim() || null;
              }
            } catch {
              // CORS blocked — expected in browser
            }
            channelName = channelName || channelId;
          }

          channelRow = await tablesDB.createRow(
            DATABASE_ID,
            CHANNELS_TABLE_ID,
            ID.unique(),
            {
              channel_id: channelId,
              name: channelName,
              rss_url: rssUrl,
              thumbnail_url: "",
            }
          );
        }

        // 3. Create subscription
        await tablesDB.createRow(
          DATABASE_ID,
          SUBSCRIPTIONS_TABLE_ID,
          ID.unique(),
          {
            user_id: user.$id,
            channel_id: channelId,
          }
        );

        await fetchChannels();
        return channelRow;
      } catch (err) {
        if (!error) setError(err?.message || "Failed to add channel");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, fetchChannels]
  );

  const removeChannel = useCallback(
    async (channelId) => {
      if (!user) throw new Error("Must be logged in");

      try {
        setLoading(true);
        setError(null);

        const subs = await tablesDB.listRows(
          DATABASE_ID,
          SUBSCRIPTIONS_TABLE_ID,
          [
            Query.equal("user_id", user.$id),
            Query.equal("channel_id", channelId),
            Query.limit(1),
          ]
        );

        if (subs.rows.length > 0) {
          const rowId = subs.rows[0].$id ?? subs.rows[0].id;
          await tablesDB.deleteRow(
            DATABASE_ID,
            SUBSCRIPTIONS_TABLE_ID,
            rowId
          );
        }

        await fetchChannels();
      } catch (err) {
        setError(err?.message || "Failed to remove channel");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user, fetchChannels]
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    channels,
    loading,
    error,
    addChannel,
    removeChannel,
    clearError,
    refreshChannels: fetchChannels,
  };
}
