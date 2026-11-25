/**
 * useSummaries Hook
 * ==================
 * Consumes video summaries, stats, pagination, and Realtime sync from TrackerProvider.
 */

import { useContext } from "react";
import { TrackerContext } from "../context/TrackerContext";

export function useSummaries() {
  const ctx = useContext(TrackerContext);
  if (!ctx) {
    throw new Error("useSummaries must be used within a TrackerProvider");
  }
  return {
    summaries: ctx.summaries,
    loading: ctx.summariesLoading,
    hasMore: ctx.hasMore,
    error: ctx.summariesError,
    stats: ctx.stats,
    loadMore: ctx.loadMore,
    refresh: ctx.refreshSummaries,
    retrySummary: ctx.retrySummary,
    localSyncSupported: ctx.localSyncSupported,
    syncRunning: ctx.syncRunning,
    syncNow: ctx.syncNow,
  };
}
