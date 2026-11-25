import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useChannels } from "../hooks/useChannels";
import { useSummaries } from "../hooks/useSummaries";
import Layout from "../components/Layout";
import SummaryFeed from "../components/SummaryFeed";
import {
  Search,
  Library,
  PlayCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Filter,
  Tv,
} from "lucide-react";

export default function LibraryPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { channels } = useChannels();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");

  const {
    summaries,
    stats: globalStats,
    loading: summariesLoading,
    hasMore,
    loadMore,
    refresh,
    retrySummary,
  } = useSummaries();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const channelFiltered = useMemo(() => {
    if (channelFilter === "all") return summaries;
    return summaries.filter((v) => v?.channel_id === channelFilter);
  }, [summaries, channelFilter]);

  const filteredSummaries = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return channelFiltered.filter((video) => {
      if (!video) return false;

      if (statusFilter === "processing") {
        if (video.status !== "processing" && video.status !== "pending") {
          return false;
        }
      } else if (statusFilter !== "all" && video.status !== statusFilter) {
        return false;
      }

      if (query) {
        const title = (video.title || "").toLowerCase();
        const summaryText = (video.ai_summary || "").toLowerCase();
        const match = channels.find(
          (c) => (c?.channel_id ?? c?.data?.channel_id) === video.channel_id,
        );
        const channelName = (
          match?.name ??
          match?.data?.name ??
          ""
        ).toLowerCase();
        return (
          title.includes(query) ||
          summaryText.includes(query) ||
          channelName.includes(query)
        );
      }

      return true;
    });
  }, [channelFiltered, searchQuery, statusFilter, channels]);

  const tabCounts = useMemo(() => {
    if (channelFilter === "all" && !searchQuery.trim() && globalStats) {
      return {
        all: Math.max(globalStats.total, summaries.length),
        completed: globalStats.completed,
        processing: globalStats.processing,
        failed: globalStats.failed,
      };
    }
    return {
      all: channelFiltered.length,
      completed: channelFiltered.filter((s) => s.status === "completed").length,
      processing: channelFiltered.filter(
        (s) => s.status === "processing" || s.status === "pending",
      ).length,
      failed: channelFiltered.filter((s) => s.status === "failed").length,
    };
  }, [channelFilter, searchQuery, globalStats, summaries.length, channelFiltered]);

  if (authLoading) {
    return (
      <div className="min-h-screen page-bg flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500/30 border-t-blue-400 animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) return null;

  const tabs = [
    {
      id: "all",
      label: "All",
      icon: PlayCircle,
      count: tabCounts.all,
      activeClass: "bg-zinc-800 text-white border-white/20",
    },
    {
      id: "completed",
      label: "Summarized",
      icon: CheckCircle2,
      count: tabCounts.completed,
      activeClass:
        "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    },
    {
      id: "processing",
      label: "In Progress",
      icon: Loader2,
      count: tabCounts.processing,
      activeClass: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    },
    {
      id: "failed",
      label: "Failed",
      icon: AlertTriangle,
      count: tabCounts.failed,
      activeClass: "bg-red-500/20 text-red-300 border-red-500/40",
    },
  ];

  const hasActiveFilters =
    !!searchQuery || statusFilter !== "all" || channelFilter !== "all";

  return (
    <Layout>
      <title>Library — TubeDigest</title>

      {/* Page Header */}
      <div className="mb-7 animate-fade-in">
        <div className="flex items-center gap-2 mb-2">
          <Library className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold uppercase tracking-widest text-blue-400">
            Library
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
          Summary Library
        </h1>
        <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
          Browse, search, and filter all AI-generated video summaries across
          your tracked channels.
        </p>
      </div>

      {/* Filters Bar */}
      <div className="glass-card p-5 mb-7 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3.5 justify-between lg:items-center">
          {/* Search + Channel Filter */}
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative flex-1 sm:max-w-sm group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-blue-400 transition-colors" />
              <input
                type="text"
                placeholder="Search titles, channels, or summaries…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-light pl-10"
              />
            </div>

            {channels.length > 1 && (
              <div className="relative sm:w-52">
                <Tv className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                <select
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value)}
                  className="input-light pl-10 pr-8 appearance-none cursor-pointer bg-zinc-900/90"
                  aria-label="Filter by channel"
                >
                  <option value="all">All Channels ({channels.length})</option>
                  {channels.map((ch) => {
                    const cid = ch.channel_id ?? ch.data?.channel_id;
                    const cname =
                      ch.name && ch.name !== cid
                        ? ch.name
                        : `Channel ${cid?.substring(0, 8)}…`;
                    return (
                      <option key={cid} value={cid}>
                        {cname}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex gap-2 overflow-x-auto sidebar-scroll pb-1 lg:pb-0">
            {tabs.map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap cursor-pointer transition-all border shrink-0 ${
                    isActive
                      ? `${tab.activeClass} shadow-md`
                      : "bg-white/[0.04] text-zinc-400 border-white/[0.06] hover:bg-white/[0.08] hover:text-zinc-200"
                  }`}
                >
                  <tab.icon
                    className={`w-4 h-4 ${isActive && tab.id === "processing" ? "animate-spin" : ""}`}
                  />
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/10 text-current">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active filter indicator */}
        {hasActiveFilters && (
          <div className="flex items-center gap-3 bg-white/[0.04] px-3.5 py-1.5 rounded-lg w-fit border border-white/[0.06]">
            <span className="text-xs font-semibold text-zinc-400">
              Showing{" "}
              <span className="text-white">{filteredSummaries.length}</span> of{" "}
              {summaries.length} loaded videos
            </span>
            <span className="w-px h-3 bg-white/20" />
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setChannelFilter("all");
              }}
              className="text-xs font-bold cursor-pointer transition-colors text-blue-400 hover:text-blue-300"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Results or empty filtered state */}
      {filteredSummaries.length === 0 && !summariesLoading && hasActiveFilters ? (
        <div className="glass-card p-14 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center bg-white/[0.05] border border-white/10 relative">
            <div className="absolute inset-0 bg-blue-500/15 blur-xl rounded-full" />
            <Filter className="w-8 h-8 text-zinc-400 relative z-10" />
          </div>
          <h3 className="text-xl font-bold mb-2 text-zinc-100">
            No matching videos
          </h3>
          <p className="text-sm text-zinc-400 mb-6">
            {hasMore
              ? "Try loading more summaries or adjusting your active filters."
              : "Try adjusting your search query or active filters."}
          </p>
          <div className="flex items-center justify-center gap-3">
            {hasMore && (
              <button
                type="button"
                onClick={loadMore}
                className="btn-primary text-sm"
              >
                Load More Videos
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setChannelFilter("all");
              }}
              className="btn-secondary text-sm"
            >
              Clear all filters
            </button>
          </div>
        </div>
      ) : (
        <SummaryFeed
          summaries={filteredSummaries}
          channels={channels}
          loading={summariesLoading}
          hasMore={hasMore}
          onLoadMore={loadMore}
          onRefresh={refresh}
          onRetry={retrySummary}
        />
      )}
    </Layout>
  );
}
