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

/**
 * Extract a YouTube channel ID from various URL formats.
 */
function parseChannelInput(input) {
  const trimmed = input.trim();

  if (/^UC[\w-]{22}$/.test(trimmed)) {
    return { channelId: trimmed, type: "id" };
  }

  const channelMatch = trimmed.match(/youtube\.com\/channel\/(UC[\w-]{22})/);
  if (channelMatch) {
    return { channelId: channelMatch[1], type: "url" };
  }

  const handleMatch = trimmed.match(/youtube\.com\/@([\w.-]+)/);
  if (handleMatch) {
    return { handle: handleMatch[1], type: "handle" };
  }

  if (trimmed.startsWith("UC") && trimmed.length >= 20) {
    return { channelId: trimmed, type: "id" };
  }

  return { error: "Invalid input. Please provide a YouTube channel URL or channel ID (starts with UC).", type: "invalid" };
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

      const channelIds = subsResponse.rows.map((s) => s.channel_id);

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

      if (parsed.type === "handle") {
        const msg =
          "YouTube @handles cannot be resolved without the YouTube Data API. " +
          "Please provide the channel URL with the channel ID (e.g., youtube.com/channel/UC...).";
        setError(msg);
        throw new Error(msg);
      }

      const channelId = parsed.channelId;
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
