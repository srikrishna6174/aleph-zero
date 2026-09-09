/**
 * useSummaries Hook
 * ==================
 * Fetches and provides real-time updates for AI-generated video summaries
 * using the TablesDB API and Appwrite Realtime.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Query } from "appwrite";
import {
  client,
  tablesDB,
  DATABASE_ID,
  VIDEOS_TABLE_ID,
} from "../lib/appwrite";
import { useAuth } from "./useAuth";

const PAGE_SIZE = 20;

export function useSummaries(subscribedChannelIds = []) {
  const { user } = useAuth();
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const offsetRef = useRef(0);

  // Stabilize the channel IDs — only change when the actual values change
  const channelIdsKey = useMemo(
    () => JSON.stringify([...subscribedChannelIds].sort()),
    [subscribedChannelIds]
  );
  const stableChannelIds = useRef(subscribedChannelIds);
  useEffect(() => {
    stableChannelIds.current = subscribedChannelIds;
  }, [channelIdsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSummaries = useCallback(
    async (reset = true) => {
      const ids = stableChannelIds.current;
      if (!user || ids.length === 0) {
        setSummaries([]);
        setHasMore(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const offset = reset ? 0 : offsetRef.current;

        const response = await tablesDB.listRows(
          DATABASE_ID,
          VIDEOS_TABLE_ID,
          [
            Query.equal("channel_id", ids),
            Query.orderDesc("published_at"),
            Query.limit(PAGE_SIZE),
            Query.offset(offset),
          ]
        );

        const rows = response.rows;

        if (reset) {
          setSummaries(rows);
          offsetRef.current = rows.length;
        } else {
          setSummaries((prev) => [...prev, ...rows]);
          offsetRef.current += rows.length;
        }

        setHasMore(rows.length === PAGE_SIZE);
      } catch (err) {
        console.error("Error fetching summaries:", err);
        setError(err?.message || "Failed to load summaries");
      } finally {
        setLoading(false);
      }
    },
    [user, channelIdsKey] // depends on serialized key, not array ref
  );

  useEffect(() => {
    fetchSummaries(true);
  }, [fetchSummaries]);

  // Subscribe to Realtime updates on the videos table
  useEffect(() => {
    const ids = stableChannelIds.current;
    if (!user || ids.length === 0) return;

    const channel = `databases.${DATABASE_ID}.tables.${VIDEOS_TABLE_ID}.rows`;

    const unsubscribe = client.subscribe(channel, (response) => {
      const payload = response.payload;
      const events = response.events || [];

      if (!stableChannelIds.current.includes(payload?.channel_id)) {
        return;
      }

      const isCreate = events.some((e) => e.includes(".create"));
      const isUpdate = events.some((e) => e.includes(".update"));

      if (isCreate) {
        setSummaries((prev) => {
          if (prev.some((s) => s.$id === payload.$id)) return prev;
          return [payload, ...prev];
        });
      } else if (isUpdate) {
        setSummaries((prev) =>
          prev.map((s) => (s.$id === payload.$id ? payload : s))
        );
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user, channelIdsKey]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchSummaries(false);
    }
  }, [loading, hasMore, fetchSummaries]);

  const refresh = useCallback(() => {
    fetchSummaries(true);
  }, [fetchSummaries]);

  const retrySummary = useCallback(async (documentId) => {
    try {
      await tablesDB.updateRow(
        DATABASE_ID,
        VIDEOS_TABLE_ID,
        documentId,
        {
          status: "pending",
          error_message: ""
        }
      );
      // Optimistic update
      setSummaries(prev => prev.map(s => 
        s.$id === documentId ? { ...s, status: "pending", error_message: "" } : s
      ));
      return true;
    } catch (err) {
      console.error("Failed to retry summary:", err);
      return false;
    }
  }, []);

  return {
    summaries,
    loading,
    hasMore,
    error,
    loadMore,
    refresh,
    retrySummary,
  };
}
