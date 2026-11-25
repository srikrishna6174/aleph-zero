/**
 * TrackerProvider
 * ===============
 * Centralized state provider for channels, summaries, accurate global stats,
 * Appwrite Realtime subscriptions, YouTube URL/handle resolution, on-demand
 * video selection + summary generation, and local worker sync.
 */

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { Channel, ID, Query } from "appwrite";
import {
  account,
  client,
  tablesDB,
  DATABASE_ID,
  CHANNELS_TABLE_ID,
  SUBSCRIPTIONS_TABLE_ID,
  VIDEOS_TABLE_ID,
} from "../lib/appwrite";
import { useAuth } from "../hooks/useAuth";
import { POPULAR_CHANNELS } from "../constants/popularChannels";
import { TrackerContext } from "./TrackerContext";

const PAGE_SIZE = 25;

const RESERVED_SEGMENTS = new Set([
  "watch",
  "playlist",
  "feed",
  "feeds",
  "channel",
  "c",
  "user",
  "results",
  "shorts",
  "live",
  "clip",
  "hashtag",
  "account",
  "premium",
]);

function extractVideoId(url) {
  if (!url || typeof url !== "string") return null;
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|live\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i,
  );
  return match ? match[1] : null;
}

function parseChannelInput(raw) {
  if (!raw || typeof raw !== "string") {
    return {
      error: "Please enter a YouTube channel URL, @handle, video URL, or UC… ID.",
      type: "invalid",
    };
  }

  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) {
    return { error: "Input cannot be empty.", type: "invalid" };
  }

  if (/^UC[\w-]{22}$/.test(trimmed)) {
    return { channelId: trimmed, type: "id" };
  }

  const withoutProto = trimmed
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "");

  const channelPathMatch = withoutProto.match(
    /youtube\.com\/channel\/(UC[\w-]{22})/i,
  );
  if (channelPathMatch) {
    return { channelId: channelPathMatch[1], type: "id" };
  }

  const videoId = extractVideoId(trimmed);
  if (videoId) {
    return { videoId, type: "video" };
  }

  const atHandleMatch = withoutProto.match(/youtube\.com\/@([\w.-]+)/i);
  if (atHandleMatch) {
    return {
      handle: atHandleMatch[1],
      handleRaw: `@${atHandleMatch[1]}`,
      type: "handle",
    };
  }

  const cUserMatch = withoutProto.match(/youtube\.com\/(?:c|user)\/([\w.-]+)/i);
  if (cUserMatch) {
    return { handle: cUserMatch[1], handleRaw: cUserMatch[1], type: "handle" };
  }

  const customMatch = withoutProto.match(/youtube\.com\/([\w.-]+)/i);
  if (customMatch) {
    const seg = customMatch[1];
    if (!RESERVED_SEGMENTS.has(seg.toLowerCase())) {
      return { handle: seg, handleRaw: seg, type: "handle" };
    }
  }

  if (trimmed.startsWith("@") && trimmed.length > 1) {
    return { handle: trimmed.slice(1), handleRaw: trimmed, type: "handle" };
  }

  if (
    !trimmed.includes("/") &&
    !withoutProto.includes("youtube.com") &&
    trimmed.length > 0
  ) {
    return { handle: trimmed, handleRaw: trimmed, type: "handle" };
  }

  return {
    error:
      "Invalid input. Provide a YouTube channel URL, @handle, video URL, or UC… channel ID.",
    type: "invalid",
  };
}

async function resolveViaLocalEndpoint(input) {
  try {
    const res = await fetch(
      `/api/resolve-channel?input=${encodeURIComponent(input)}`,
    );
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return null;
    }
    const data = await res.json();
    if (!res.ok) {
      return { error: data?.error || "Could not resolve channel." };
    }
    if (data?.channelId) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

async function resolveHandleViaYouTubeAPI(handle, handleRaw, apiKey) {
  const atHandle = handle.startsWith("@") ? handle : `@${handle}`;
  const handleUrl = `https://www.googleapis.com/youtube/v3/channels?part=id,snippet&forHandle=${encodeURIComponent(atHandle)}&key=${apiKey}`;
  const res = await fetch(handleUrl);
  const data = await res.json();

  if (data.items && data.items.length > 0) {
    const item = data.items[0];
    return {
      channelId: item.id,
      name: item.snippet?.title || item.id,
      thumbnailUrl: item.snippet?.thumbnails?.default?.url || "",
    };
  }

  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(handleRaw)}&maxResults=1&key=${apiKey}`;
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();

  if (searchData.items && searchData.items.length > 0) {
    const item = searchData.items[0];
    return {
      channelId: item.snippet.channelId,
      name: item.snippet.channelTitle || item.snippet.channelId,
      thumbnailUrl: item.snippet?.thumbnails?.default?.url || "",
    };
  }

  throw new Error(
    `Could not find a YouTube channel for "${handleRaw}". Please check the URL or handle.`,
  );
}

function computeStatsFromList(list) {
  return {
    total: list.length,
    completed: list.filter((s) => s?.status === "completed").length,
    processing: list.filter(
      (s) => s?.status === "processing" || s?.status === "pending",
    ).length,
    failed: list.filter((s) => s?.status === "failed").length,
  };
}

export function TrackerProvider({ children }) {
  const { user } = useAuth();

  // Channel state
  const [channels, setChannels] = useState([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [channelsInitialized, setChannelsInitialized] = useState(false);
  const [channelsError, setChannelsError] = useState(null);

  // Summaries state
  const [summaries, setSummaries] = useState([]);
  const [summariesLoading, setSummariesLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [summariesError, setSummariesError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    processing: 0,
    failed: 0,
  });

  // Local worker sync + modal state
  const [localSyncSupported, setLocalSyncSupported] = useState(false);
  const [syncRunning, setSyncRunning] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);

  const offsetRef = useRef(0);
  const syncPollRef = useRef(null);
  const watchPollsRef = useRef(new Set());

  useEffect(() => {
    let active = true;
    fetch("/api/sync-status")
      .then(async (res) => {
        if (!res.ok) return null;
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) return null;
        return res.json();
      })
      .then((data) => {
        if (active && data?.supported) {
          setLocalSyncSupported(true);
          setSyncRunning(!!data.running);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // ── Fetch Channels ────────────────────────────────────────────────────────
  const fetchChannels = useCallback(async () => {
    if (!user) {
      setChannels([]);
      setChannelsInitialized(true);
      setChannelsLoading(false);
      return;
    }

    try {
      setChannelsLoading(true);
      setChannelsError(null);

      const subsResponse = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: SUBSCRIPTIONS_TABLE_ID,
        queries: [Query.equal("user_id", user.$id), Query.limit(100)],
      });

      const rows = subsResponse.rows || [];
      const channelIds = rows
        .map((s) => s.channel_id ?? s.data?.channel_id)
        .filter(Boolean);

      if (channelIds.length === 0) {
        setChannels([]);
        return;
      }

      const channelsResponse = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: CHANNELS_TABLE_ID,
        queries: [Query.equal("channel_id", channelIds), Query.limit(100)],
      });

      setChannels(channelsResponse.rows || []);
    } catch (err) {
      console.error("Error fetching channels:", err);
      setChannelsError(err?.message || "Failed to load channels");
    } finally {
      setChannelsLoading(false);
      setChannelsInitialized(true);
    }
  }, [user]);

  useEffect(() => {
    setChannelsInitialized(false);
    fetchChannels();
  }, [fetchChannels]);

  const subscribedChannelIds = useMemo(
    () =>
      channels
        .map((ch) => ch.channel_id ?? ch.data?.channel_id)
        .filter(Boolean),
    [channels],
  );

  const channelIdsKey = useMemo(
    () => JSON.stringify([...subscribedChannelIds].sort()),
    [subscribedChannelIds],
  );

  const stableChannelIdsRef = useRef(subscribedChannelIds);
  stableChannelIdsRef.current = subscribedChannelIds;

  // ── Fetch Accurate Totals Across All Subscribed Channels ──────────────────
  const fetchStats = useCallback(
    async (ids) => {
      if (!user || !ids || ids.length === 0) {
        setStats({ total: 0, completed: 0, processing: 0, failed: 0 });
        return;
      }

      try {
        const [allRes, completedRes, processingRes, failedRes] =
          await Promise.all([
            tablesDB.listRows({
              databaseId: DATABASE_ID,
              tableId: VIDEOS_TABLE_ID,
              queries: [Query.equal("channel_id", ids), Query.limit(1)],
            }),
            tablesDB.listRows({
              databaseId: DATABASE_ID,
              tableId: VIDEOS_TABLE_ID,
              queries: [
                Query.equal("channel_id", ids),
                Query.equal("status", "completed"),
                Query.limit(1),
              ],
            }),
            tablesDB.listRows({
              databaseId: DATABASE_ID,
              tableId: VIDEOS_TABLE_ID,
              queries: [
                Query.equal("channel_id", ids),
                Query.equal("status", ["processing", "pending"]),
                Query.limit(1),
              ],
            }),
            tablesDB.listRows({
              databaseId: DATABASE_ID,
              tableId: VIDEOS_TABLE_ID,
              queries: [
                Query.equal("channel_id", ids),
                Query.equal("status", "failed"),
                Query.limit(1),
              ],
            }),
          ]);

        setStats({
          total: allRes.total ?? 0,
          completed: completedRes.total ?? 0,
          processing: processingRes.total ?? 0,
          failed: failedRes.total ?? 0,
        });
      } catch {
        // Fallback: computed from loaded summaries when queries fail
      }
    },
    [user],
  );

  // ── Fetch Summaries ───────────────────────────────────────────────────────
  const fetchSummaries = useCallback(
    async (reset = true) => {
      const ids = stableChannelIdsRef.current;
      if (!user || !channelsInitialized) {
        return;
      }

      if (ids.length === 0) {
        setSummaries([]);
        setHasMore(false);
        setStats({ total: 0, completed: 0, processing: 0, failed: 0 });
        setSummariesLoading(false);
        return;
      }

      try {
        setSummariesLoading(true);
        setSummariesError(null);

        const offset = reset ? 0 : offsetRef.current;

        const response = await tablesDB.listRows({
          databaseId: DATABASE_ID,
          tableId: VIDEOS_TABLE_ID,
          queries: [
            Query.equal("channel_id", ids),
            Query.orderDesc("published_at"),
            Query.limit(PAGE_SIZE),
            Query.offset(offset),
          ],
        });

        const rows = response.rows || [];

        if (reset) {
          setSummaries(rows);
          offsetRef.current = rows.length;
          fetchStats(ids);
        } else {
          setSummaries((prev) => {
            const seenIds = new Set(prev.map((item) => item.$id ?? item.id));
            const uniqueNew = rows.filter(
              (item) => !seenIds.has(item.$id ?? item.id),
            );
            return [...prev, ...uniqueNew];
          });
          offsetRef.current += rows.length;
        }

        setHasMore(rows.length === PAGE_SIZE);
      } catch (err) {
        console.error("Error fetching summaries:", err);
        setSummariesError(err?.message || "Failed to load summaries");
      } finally {
        setSummariesLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, channelsInitialized, channelIdsKey, fetchStats],
  );

  useEffect(() => {
    fetchSummaries(true);
  }, [fetchSummaries]);

  // ── Realtime Subscriptions (Videos + Channels) ────────────────────────────
  useEffect(() => {
    if (!user || stableChannelIdsRef.current.length === 0) return;

    const videosChannel = Channel.tablesdb(DATABASE_ID)
      .table(VIDEOS_TABLE_ID)
      .row();
    const channelsChannel = Channel.tablesdb(DATABASE_ID)
      .table(CHANNELS_TABLE_ID)
      .row();

    const unsubscribe = client.subscribe(
      [videosChannel, channelsChannel],
      (response) => {
        const payload = response.payload;
        const events = response.events || [];
        if (!payload) return;

        const isVideosEvent = events.some((e) =>
          e.includes(`.tables.${VIDEOS_TABLE_ID}.`),
        );
        const isChannelsEvent = events.some((e) =>
          e.includes(`.tables.${CHANNELS_TABLE_ID}.`),
        );

        if (isChannelsEvent) {
          if (stableChannelIdsRef.current.includes(payload.channel_id)) {
            setChannels((prev) =>
              prev.map((ch) =>
                ch.$id === payload.$id || ch.channel_id === payload.channel_id
                  ? payload
                  : ch,
              ),
            );
          }
          return;
        }

        if (isVideosEvent) {
          if (!stableChannelIdsRef.current.includes(payload.channel_id)) {
            return;
          }

          const isCreate = events.some((e) => e.includes(".create"));
          const isUpdate = events.some((e) => e.includes(".update"));
          const isDelete = events.some((e) => e.includes(".delete"));

          if (isCreate) {
            setSummaries((prev) => {
              if (prev.some((s) => s.$id === payload.$id)) return prev;
              return [payload, ...prev].sort((a, b) =>
                (b.published_at || "").localeCompare(a.published_at || ""),
              );
            });
            fetchStats(stableChannelIdsRef.current);
          } else if (isUpdate) {
            setSummaries((prev) => {
              const exists = prev.some((s) => s.$id === payload.$id);
              if (!exists) return [payload, ...prev];
              return prev.map((s) => (s.$id === payload.$id ? payload : s));
            });
            fetchStats(stableChannelIdsRef.current);
          } else if (isDelete) {
            setSummaries((prev) => prev.filter((s) => s.$id !== payload.$id));
            fetchStats(stableChannelIdsRef.current);
          }
        }
      },
    );

    return () => {
      unsubscribe();
    };
  }, [user, channelIdsKey, fetchStats]);

  // ── Poll specific video IDs until settled (resilience fallback to Realtime)
  const watchVideosUntilSettled = useCallback(
    (videoIds) => {
      if (!videoIds || videoIds.length === 0) return;
      let attempts = 0;
      const timer = setInterval(async () => {
        attempts += 1;
        try {
          const res = await tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: VIDEOS_TABLE_ID,
            queries: [Query.equal("video_id", videoIds), Query.limit(50)],
          });
          const rows = res.rows || [];
          if (rows.length > 0) {
            setSummaries((prev) => {
              const byId = new Map(rows.map((r) => [r.$id ?? r.id, r]));
              const updated = prev.map((item) => {
                const key = item.$id ?? item.id;
                return byId.has(key) ? byId.get(key) : item;
              });
              // Prepend any newly created rows not yet in `prev`
              const existingKeys = new Set(updated.map((u) => u.$id ?? u.id));
              const extras = rows.filter(
                (r) => !existingKeys.has(r.$id ?? r.id),
              );
              return [...extras, ...updated].sort((a, b) =>
                (b.published_at || "").localeCompare(a.published_at || ""),
              );
            });
            fetchStats(stableChannelIdsRef.current);
          }

          const stillActive = rows.some(
            (r) => r.status === "pending" || r.status === "processing",
          );
          if ((!stillActive && rows.length >= videoIds.length) || attempts >= 40) {
            clearInterval(timer);
            watchPollsRef.current.delete(timer);
            setSyncRunning(false);
          }
        } catch {
          if (attempts >= 40) {
            clearInterval(timer);
            watchPollsRef.current.delete(timer);
          }
        }
      }, 3000);
      watchPollsRef.current.add(timer);
    },
    [fetchStats],
  );

  useEffect(() => {
    const timers = watchPollsRef.current;
    return () => {
      if (syncPollRef.current) clearInterval(syncPollRef.current);
      for (const t of timers) clearInterval(t);
      timers.clear();
    };
  }, []);

  // ── Local Worker Sync Trigger ─────────────────────────────────────────────
  const syncNow = useCallback(
    async ({ channelId = null, retryFailed = false } = {}) => {
      try {
        const res = await fetch("/api/sync-worker", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channelId, retryFailed }),
        });

        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) {
          return { supported: false };
        }

        const data = await res.json();
        if (!res.ok) {
          return { supported: !!data.supported, error: data.error };
        }

        setLocalSyncSupported(true);
        setSyncRunning(true);

        if (syncPollRef.current) clearInterval(syncPollRef.current);
        syncPollRef.current = setInterval(async () => {
          try {
            const stRes = await fetch("/api/sync-status");
            if (!stRes.ok) return;
            const st = await stRes.json();
            setSyncRunning(!!st.running);
            if (!st.running) {
              clearInterval(syncPollRef.current);
              syncPollRef.current = null;
              await fetchChannels();
              await fetchSummaries(true);
            }
          } catch {
            clearInterval(syncPollRef.current);
            syncPollRef.current = null;
            setSyncRunning(false);
          }
        }, 2500);

        return { supported: true, status: data.status };
      } catch {
        return { supported: false };
      }
    },
    [fetchChannels, fetchSummaries],
  );

  // ── Add Channel ───────────────────────────────────────────────────────────
  const addChannel = useCallback(
    async (input, customName = "") => {
      if (!user) throw new Error("Must be logged in to track channels.");

      setChannelsError(null);

      const parsed = parseChannelInput(input);
      if (parsed.type === "invalid") {
        setChannelsError(parsed.error);
        throw new Error(parsed.error);
      }

      let channelId = parsed.channelId || null;
      let resolvedName = customName.trim() || null;
      let thumbnailUrl = "";

      const normalizedInput = input.trim().toLowerCase().replace(/^@/, "");
      const matchedPreset = POPULAR_CHANNELS.find(
        (p) =>
          p.handle.toLowerCase().replace(/^@/, "") === normalizedInput ||
          p.channelId.toLowerCase() === input.trim().toLowerCase() ||
          p.name.toLowerCase() === input.trim().toLowerCase(),
      );

      if (matchedPreset) {
        channelId = matchedPreset.channelId;
        if (!resolvedName) resolvedName = matchedPreset.name;
      }

      setChannelsLoading(true);
      try {
        const needsResolve = !channelId;
        const needsMetadata = !resolvedName || !thumbnailUrl;

        if (needsResolve || needsMetadata) {
          const targetForResolve = channelId || input.trim();
          const localResolved = await resolveViaLocalEndpoint(targetForResolve);

          if (localResolved && !localResolved.error && localResolved.channelId) {
            if (!channelId) channelId = localResolved.channelId;
            if (!resolvedName && localResolved.name) {
              resolvedName = localResolved.name;
            }
            if (localResolved.thumbnailUrl) {
              thumbnailUrl = localResolved.thumbnailUrl;
            }
          } else if (needsResolve) {
            const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
            if (parsed.type === "handle" && apiKey) {
              const apiResolved = await resolveHandleViaYouTubeAPI(
                parsed.handle,
                parsed.handleRaw ?? parsed.handle,
                apiKey,
              );
              channelId = apiResolved.channelId;
              if (!resolvedName) resolvedName = apiResolved.name;
              if (apiResolved.thumbnailUrl) {
                thumbnailUrl = apiResolved.thumbnailUrl;
              }
            } else if (parsed.type === "video") {
              const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${parsed.videoId}&format=json`;
              const oembedRes = await fetch(oembedUrl);
              if (oembedRes.ok) {
                const oembedData = await oembedRes.json();
                const authorUrl = oembedData.author_url || "";
                const authorName = oembedData.author_name || "";
                if (!resolvedName && authorName) resolvedName = authorName;

                const channelInAuthor = authorUrl.match(
                  /\/channel\/(UC[\w-]{22})/i,
                );
                if (channelInAuthor) {
                  channelId = channelInAuthor[1];
                } else {
                  const authorHandle = authorUrl.split("/@")[1] || "";
                  const presetFromAuthor = POPULAR_CHANNELS.find(
                    (p) =>
                      p.handle.toLowerCase().replace(/^@/, "") ===
                      authorHandle.toLowerCase(),
                  );
                  if (presetFromAuthor) {
                    channelId = presetFromAuthor.channelId;
                  } else {
                    throw new Error(
                      localResolved?.error ||
                        `Detected video from "${authorName}". Please provide the 24-character Channel ID (starts with UC...) or configure VITE_YOUTUBE_API_KEY.`,
                    );
                  }
                }
              } else {
                throw new Error(
                  localResolved?.error ||
                    "Could not inspect that YouTube video URL. Please verify it or provide the Channel ID (UC...).",
                );
              }
            } else {
              throw new Error(
                localResolved?.error ||
                  `Could not resolve "@${parsed.handle}". Please check the spelling, paste the 24-character Channel ID (UC...), or select a preset.`,
              );
            }
          }
        }

        if (!channelId) {
          throw new Error(
            "Unable to determine YouTube Channel ID. Please provide a valid UC… ID or URL.",
          );
        }

        const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

        const existingSubs = await tablesDB.listRows({
          databaseId: DATABASE_ID,
          tableId: SUBSCRIPTIONS_TABLE_ID,
          queries: [
            Query.equal("user_id", user.$id),
            Query.equal("channel_id", channelId),
            Query.limit(1),
          ],
        });

        if (existingSubs.rows && existingSubs.rows.length > 0) {
          throw new Error("You are already subscribed to this channel.");
        }

        let channelRow;
        const existingChannels = await tablesDB.listRows({
          databaseId: DATABASE_ID,
          tableId: CHANNELS_TABLE_ID,
          queries: [Query.equal("channel_id", channelId), Query.limit(1)],
        });

        if (existingChannels.rows && existingChannels.rows.length > 0) {
          channelRow = existingChannels.rows[0];
          const patchData = {};
          if (
            resolvedName &&
            (channelRow.name === channelId ||
              !channelRow.name ||
              customName.trim())
          ) {
            patchData.name = resolvedName;
          }
          if (thumbnailUrl && !channelRow.thumbnail_url) {
            patchData.thumbnail_url = thumbnailUrl;
          }
          if (Object.keys(patchData).length > 0) {
            try {
              const rowId = channelRow.$id ?? channelRow.id;
              await tablesDB.updateRow({
                databaseId: DATABASE_ID,
                tableId: CHANNELS_TABLE_ID,
                rowId,
                data: patchData,
              });
            } catch {
              // ignore optional metadata patch failure
            }
          }
        } else {
          channelRow = await tablesDB.createRow({
            databaseId: DATABASE_ID,
            tableId: CHANNELS_TABLE_ID,
            rowId: ID.unique(),
            data: {
              channel_id: channelId,
              name: resolvedName || channelId,
              rss_url: rssUrl,
              thumbnail_url: thumbnailUrl || "",
            },
          });
        }

        await tablesDB.createRow({
          databaseId: DATABASE_ID,
          tableId: SUBSCRIPTIONS_TABLE_ID,
          rowId: ID.unique(),
          data: {
            user_id: user.$id,
            channel_id: channelId,
          },
        });

        await fetchChannels();

        if (localSyncSupported) {
          syncNow({ channelId });
        }

        return channelRow;
      } catch (err) {
        const msg = err?.message || "Failed to add channel";
        setChannelsError(msg);
        throw err;
      } finally {
        setChannelsLoading(false);
      }
    },
    [user, fetchChannels, localSyncSupported, syncNow],
  );

  // ── Remove Channel ────────────────────────────────────────────────────────
  const removeChannel = useCallback(
    async (channelId) => {
      if (!user) throw new Error("Must be logged in");

      try {
        setChannelsLoading(true);
        setChannelsError(null);

        const subs = await tablesDB.listRows({
          databaseId: DATABASE_ID,
          tableId: SUBSCRIPTIONS_TABLE_ID,
          queries: [
            Query.equal("user_id", user.$id),
            Query.equal("channel_id", channelId),
            Query.limit(1),
          ],
        });

        if (subs.rows && subs.rows.length > 0) {
          const rowId = subs.rows[0].$id ?? subs.rows[0].id;
          await tablesDB.deleteRow({
            databaseId: DATABASE_ID,
            tableId: SUBSCRIPTIONS_TABLE_ID,
            rowId,
          });
        }

        await fetchChannels();
      } catch (err) {
        setChannelsError(err?.message || "Failed to remove channel");
        throw err;
      } finally {
        setChannelsLoading(false);
      }
    },
    [user, fetchChannels],
  );

  // ── Rename Channel Nickname ───────────────────────────────────────────────
  const updateChannelName = useCallback(
    async (channelDocId, newName) => {
      const cleanName = newName.trim();
      if (!user || !channelDocId || !cleanName) return false;
      try {
        const updated = await tablesDB.updateRow({
          databaseId: DATABASE_ID,
          tableId: CHANNELS_TABLE_ID,
          rowId: channelDocId,
          data: { name: cleanName },
        });
        setChannels((prev) =>
          prev.map((ch) =>
            (ch.$id ?? ch.id) === channelDocId
              ? { ...ch, ...updated, name: cleanName }
              : ch,
          ),
        );
        return true;
      } catch (err) {
        console.error("Failed to rename channel:", err);
        return false;
      }
    },
    [user],
  );

  // ── Browse Channel Videos / Inspect Video URL ─────────────────────────────
  const fetchChannelVideos = useCallback(async (channelId) => {
    const res = await fetch(
      `/api/channel-videos?channelId=${encodeURIComponent(channelId)}`,
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || "Failed to load channel videos.");
    }
    const videos = data.videos || [];
    if (videos.length === 0) return [];

    // Enrich with existing Appwrite video status
    try {
      const ids = videos.map((v) => v.videoId);
      const existing = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: VIDEOS_TABLE_ID,
        queries: [Query.equal("video_id", ids), Query.limit(50)],
      });
      const byVid = new Map(
        (existing.rows || []).map((r) => [r.video_id, r]),
      );
      return videos.map((v) => {
        const row = byVid.get(v.videoId);
        return row
          ? {
              ...v,
              docId: row.$id ?? row.id,
              status: row.status,
              ai_summary: row.ai_summary || "",
              error_message: row.error_message || "",
            }
          : { ...v, status: "new" };
      });
    } catch {
      return videos.map((v) => ({ ...v, status: "new" }));
    }
  }, []);

  const inspectVideoForSummary = useCallback(async (videoUrl) => {
    const res = await fetch(
      `/api/channel-videos?videoUrl=${encodeURIComponent(videoUrl)}`,
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.videos?.length) {
      throw new Error(data?.error || "Could not inspect that YouTube video URL.");
    }
    const v = data.videos[0];
    try {
      const existing = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: VIDEOS_TABLE_ID,
        queries: [Query.equal("video_id", [v.videoId]), Query.limit(1)],
      });
      const row = existing.rows?.[0];
      if (row) {
        return {
          ...v,
          docId: row.$id ?? row.id,
          status: row.status,
          ai_summary: row.ai_summary || "",
          error_message: row.error_message || "",
        };
      }
    } catch {
      // ignore
    }
    return { ...v, status: "new" };
  }, []);

  // ── Request Immediate Summary Generation for Selected Videos ──────────────
  const requestVideoSummaries = useCallback(
    async (selectedVideos = []) => {
      if (!user || !Array.isArray(selectedVideos) || selectedVideos.length === 0) {
        throw new Error("Select at least one video to summarize.");
      }

      const preparedVideos = [];
      const channelsToSubscribe = new Set();

      for (const item of selectedVideos) {
        const videoId = item.videoId || item.video_id;
        if (!videoId) continue;

        const channelId = item.channelId || item.channel_id || "";
        if (channelId && !stableChannelIdsRef.current.includes(channelId)) {
          channelsToSubscribe.add({
            channelId,
            name: item.channelName || channelId,
          });
        }

        // Ensure channel exists if user pasted a video from a new channel
        if (channelId) {
          try {
            const chCheck = await tablesDB.listRows({
              databaseId: DATABASE_ID,
              tableId: CHANNELS_TABLE_ID,
              queries: [Query.equal("channel_id", [channelId]), Query.limit(1)],
            });
            if (!chCheck.rows?.length) {
              await tablesDB.createRow({
                databaseId: DATABASE_ID,
                tableId: CHANNELS_TABLE_ID,
                rowId: ID.unique(),
                data: {
                  channel_id: channelId,
                  name: item.channelName || channelId,
                  rss_url: `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
                  thumbnail_url: "",
                },
              });
            }
            const subCheck = await tablesDB.listRows({
              databaseId: DATABASE_ID,
              tableId: SUBSCRIPTIONS_TABLE_ID,
              queries: [
                Query.equal("user_id", user.$id),
                Query.equal("channel_id", channelId),
                Query.limit(1),
              ],
            });
            if (!subCheck.rows?.length) {
              await tablesDB.createRow({
                databaseId: DATABASE_ID,
                tableId: SUBSCRIPTIONS_TABLE_ID,
                rowId: ID.unique(),
                data: { user_id: user.$id, channel_id: channelId },
              });
            }
          } catch {
            // continue even if channel upsert skipped
          }
        }

        // Upsert video row in Appwrite with status "pending"
        let docRow = null;
        try {
          const existing = await tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: VIDEOS_TABLE_ID,
            queries: [Query.equal("video_id", [videoId]), Query.limit(1)],
          });

          if (existing.rows?.length > 0) {
            const rowId = existing.rows[0].$id ?? existing.rows[0].id;
            docRow = await tablesDB.updateRow({
              databaseId: DATABASE_ID,
              tableId: VIDEOS_TABLE_ID,
              rowId,
              data: {
                status: "pending",
                error_message: "",
              },
            });
          } else {
            docRow = await tablesDB.createRow({
              databaseId: DATABASE_ID,
              tableId: VIDEOS_TABLE_ID,
              rowId: ID.unique(),
              data: {
                video_id: videoId,
                channel_id: channelId || "unknown",
                title: (item.title || `Video ${videoId}`).slice(0, 510),
                published_at:
                  item.publishedAt ||
                  item.published_at ||
                  new Date().toISOString(),
                thumbnail_url: (
                  item.thumbnailUrl ||
                  item.thumbnail_url ||
                  `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
                ).slice(0, 510),
                ai_summary: "",
                status: "pending",
                error_message: "",
              },
            });
          }
        } catch (err) {
          console.error(`Failed queueing video ${videoId}:`, err);
        }

        preparedVideos.push({
          videoId,
          channelId,
          title: item.title || `Video ${videoId}`,
          publishedAt:
            item.publishedAt || item.published_at || new Date().toISOString(),
          thumbnailUrl:
            item.thumbnailUrl ||
            item.thumbnail_url ||
            `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          description: item.description || "",
          docId: docRow?.$id ?? docRow?.id ?? item.docId ?? "",
        });

        if (docRow) {
          setSummaries((prev) => {
            const rid = docRow.$id ?? docRow.id;
            const exists = prev.some((s) => (s.$id ?? s.id) === rid);
            if (exists) {
              return prev.map((s) =>
                (s.$id ?? s.id) === rid
                  ? { ...s, ...docRow, status: "pending", error_message: "" }
                  : s,
              );
            }
            return [docRow, ...prev].sort((a, b) =>
              (b.published_at || "").localeCompare(a.published_at || ""),
            );
          });
        }
      }

      if (channelsToSubscribe.size > 0) {
        await fetchChannels();
      }
      fetchStats(stableChannelIdsRef.current);

      let jwt = "";
      try {
        const jwtRes = await account.createJWT();
        jwt = jwtRes?.jwt || "";
      } catch {
        // optional
      }

      // Trigger backend /api/request-summary (local worker OR Vercel LLM runner)
      setSyncRunning(true);
      const videoIds = preparedVideos.map((v) => v.videoId);
      let apiResult = { mode: "queued" };

      try {
        const apiRes = await fetch("/api/request-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videos: preparedVideos, jwt }),
        });
        const ct = apiRes.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          apiResult = await apiRes.json();
        }
      } catch {
        // Fallback to queued state if offline
      }

      if (apiResult.mode === "instant") {
        await fetchSummaries(true);
        setSyncRunning(false);
      } else if (apiResult.mode === "worker") {
        watchVideosUntilSettled(videoIds);
      } else {
        setSyncRunning(false);
        watchVideosUntilSettled(videoIds);
      }

      return {
        ...apiResult,
        videoIds,
        videos: preparedVideos,
      };
    },
    [user, fetchChannels, fetchStats, fetchSummaries, watchVideosUntilSettled],
  );

  // ── Pagination & Retry ────────────────────────────────────────────────────
  const loadMore = useCallback(() => {
    if (!summariesLoading && hasMore) {
      fetchSummaries(false);
    }
  }, [summariesLoading, hasMore, fetchSummaries]);

  const refreshSummaries = useCallback(() => {
    return fetchSummaries(true);
  }, [fetchSummaries]);

  const retrySummary = useCallback(
    async (documentId) => {
      try {
        const target = summaries.find((s) => (s.$id ?? s.id) === documentId);
        await tablesDB.updateRow({
          databaseId: DATABASE_ID,
          tableId: VIDEOS_TABLE_ID,
          rowId: documentId,
          data: {
            status: "pending",
            error_message: "",
          },
        });
        setSummaries((prev) => {
          const next = prev.map((s) =>
            (s.$id ?? s.id) === documentId
              ? { ...s, status: "pending", error_message: "" }
              : s,
          );
          if (stats.total <= next.length) {
            setStats(computeStatsFromList(next));
          } else {
            fetchStats(stableChannelIdsRef.current);
          }
          return next;
        });

        if (target?.video_id) {
          let jwt = "";
          try {
            const jwtRes = await account.createJWT();
            jwt = jwtRes?.jwt || "";
          } catch {
            // optional
          }
          fetch("/api/request-summary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              videos: [
                {
                  videoId: target.video_id,
                  channelId: target.channel_id,
                  title: target.title,
                  publishedAt: target.published_at,
                  thumbnailUrl: target.thumbnail_url,
                  docId: documentId,
                },
              ],
              jwt,
            }),
          })
            .then((r) => r.json().catch(() => ({})))
            .then((resData) => {
              if (resData?.mode === "instant") {
                fetchSummaries(true);
              } else if (resData?.mode === "worker") {
                setSyncRunning(true);
                watchVideosUntilSettled([target.video_id]);
              } else if (resData?.mode === "queued") {
                watchVideosUntilSettled([target.video_id]);
              }
            })
            .catch(() => {});
        } else if (localSyncSupported) {
          syncNow();
        }
        return true;
      } catch (err) {
        console.error("Failed to retry summary:", err);
        return false;
      }
    },
    [
      summaries,
      fetchStats,
      fetchSummaries,
      localSyncSupported,
      syncNow,
      stats.total,
      watchVideosUntilSettled,
    ],
  );

  const clearChannelsError = useCallback(() => setChannelsError(null), []);

  const value = {
    channels,
    channelsLoading,
    channelsInitialized,
    channelsError,
    addChannel,
    removeChannel,
    updateChannelName,
    clearChannelsError,
    refreshChannels: fetchChannels,
    popularPresets: POPULAR_CHANNELS,

    summaries,
    summariesLoading: summariesLoading || (!!user && !channelsInitialized),
    hasMore,
    summariesError,
    stats,
    loadMore,
    refreshSummaries,
    retrySummary,

    // On-demand video selection + instant summary
    fetchChannelVideos,
    inspectVideoForSummary,
    requestVideoSummaries,
    requestModalOpen,
    setRequestModalOpen,

    // Local worker sync
    localSyncSupported,
    syncRunning,
    syncNow,
  };

  return (
    <TrackerContext.Provider value={value}>{children}</TrackerContext.Provider>
  );
}
