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

function parseChannelInput(input) {
  const trimmed = input.trim();

  if (/^UC[\w-]{22}$/.test(trimmed)) {
    return { channelId: trimmed, type: "id" };
  }

  const channelMatch = trimmed.match(/youtube\.com\/channel\/(UC[\w-]{22})/);
  if (channelMatch) {
    return { channelId: channelMatch[1], type: "url" };
  }

  if (trimmed.startsWith("UC") && trimmed.length >= 20) {
    return { channelId: trimmed, type: "id" };
  }

  const handleMatch = trimmed.match(/youtube\.com\/(?:@)?([\w.-]+)/);
  if (handleMatch) {
    const matched = handleMatch[1];
    if (matched !== 'channel' && matched !== 'watch' && matched !== 'playlist' && matched !== 'feeds') {
      return { handle: matched, type: "handle" };
    }
  }

  if (!trimmed.includes("/") && !trimmed.includes("youtube.com") && trimmed.length > 0) {
    const handle = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
    return { handle: handle, type: "handle" };
  }

  return { error: "Invalid input. Please provide a YouTube channel URL, handle, or channel ID (starts with UC).", type: "invalid" };
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

      if (parsed.type === "handle") {
        const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
        if (!apiKey) {
          const msg =
            "YouTube API key is missing. Cannot resolve handles or custom URLs. " +
            "Please add VITE_YOUTUBE_API_KEY to your .env file or use a channel ID directly.";
          setError(msg);
          throw new Error(msg);
        }

        try {
          setLoading(true);
          let apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=@${parsed.handle}&key=${apiKey}`;
          let res = await fetch(apiUrl);
          let data = await res.json();

          if (data.items && data.items.length > 0) {
            channelId = data.items[0].id;
          } else {
            // Fallback for legacy custom URLs using search API
            apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${parsed.handle}&key=${apiKey}`;
            res = await fetch(apiUrl);
            data = await res.json();

            if (data.items && data.items.length > 0) {
              channelId = data.items[0].snippet.channelId;
            } else {
              const msg = "Could not find a YouTube channel matching that handle or URL.";
              setError(msg);
              throw new Error(msg);
            }
          }
        } catch (err) {
          const msg = err.message || "Failed to resolve channel via YouTube API.";
          setError(msg);
          throw new Error(msg);
        }
      }

      const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

      try {
        setLoading(true);

        // 1. Check if the channel already exists
        const existingChannels = await tablesDB.listRows(
          DATABASE_ID,
          CHANNELS_TABLE_ID,
          [Query.equal("channel_id", channelId), Query.limit(1)]
        );

        let channelRow;

        if (existingChannels.rows.length > 0) {
          channelRow = existingChannels.rows[0];
        } else {
          // Fetch channel name from RSS feed
          let channelName = channelId;
          try {
            const response = await fetch(rssUrl);
            const text = await response.text();
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, "text/xml");
            const title = xml.querySelector("title");
            if (title?.textContent) {
              channelName = title.textContent;
            }
          } catch {
            console.warn("Could not fetch channel name from RSS, using ID");
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

        // 2. Check if the user is already subscribed
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
          setError("You are already subscribed to this channel");
          return channelRow;
        }

        // 3. Create the subscription
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
        setError(err?.message || "Failed to add channel");
        throw err;
      } finally {
        setLoading(false);
      }
    },
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
