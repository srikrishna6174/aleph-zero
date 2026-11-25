/**
 * useSummaries Hook
 * ==================
 * Consumes video summaries, stats, pagination, on-demand requests, and Realtime sync.
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
    fetchChannelVideos: ctx.fetchChannelVideos,
    inspectVideoForSummary: ctx.inspectVideoForSummary,
    requestVideoSummaries: ctx.requestVideoSummaries,
    requestModalOpen: ctx.requestModalOpen,
    setRequestModalOpen: ctx.setRequestModalOpen,
    localSyncSupported: ctx.localSyncSupported,
    syncRunning: ctx.syncRunning,
    syncNow: ctx.syncNow,
  };
}
