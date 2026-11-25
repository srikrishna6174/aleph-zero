/**
 * useChannels Hook
 * =================
 * Consumes channel management state from TrackerProvider.
 */

import { useContext } from "react";
import { TrackerContext } from "../context/TrackerContext";
import { POPULAR_CHANNELS } from "../constants/popularChannels";

export { POPULAR_CHANNELS };

export function useChannels() {
  const ctx = useContext(TrackerContext);
  if (!ctx) {
    throw new Error("useChannels must be used within a TrackerProvider");
  }
  return {
    channels: ctx.channels,
    loading: ctx.channelsLoading,
    initialized: ctx.channelsInitialized,
    error: ctx.channelsError,
    addChannel: ctx.addChannel,
    removeChannel: ctx.removeChannel,
    updateChannelName: ctx.updateChannelName,
    clearError: ctx.clearChannelsError,
    refreshChannels: ctx.refreshChannels,
    popularPresets: ctx.popularPresets,
    localSyncSupported: ctx.localSyncSupported,
    syncRunning: ctx.syncRunning,
    syncNow: ctx.syncNow,
  };
}
