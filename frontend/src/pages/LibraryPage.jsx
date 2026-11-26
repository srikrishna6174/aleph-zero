import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useChannels } from "../hooks/useChannels";
import { useSummaries } from "../hooks/useSummaries";
import Layout from "../components/Layout";
import SummaryFeed from "../components/SummaryFeed";
import toast from "react-hot-toast";
import {
  Search,
  Library,
  PlayCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Filter,
  Tv,
  ListPlus,
  CheckSquare,
  X,
} from "lucide-react";

export default function LibraryPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { channels } = useChannels();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedVideoIds, setSelectedVideoIds] = useState(() => new Set());
  const [requestingSelected, setRequestingSelected] = useState(false);

  const {
    summaries,
    stats: globalStats,
    loading: summariesLoading,
    hasMore,
    loadMore,
    refresh,
    retrySummary,
    requestVideoSummaries,
    setRequestModalOpen,
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
        <div className="w-8 h-8 rounded-full border-2 border-stone-300 border-t-stone-800 animate-spin" />
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
      activeClass: "bg-stone-900 text-white border-stone-900",
    },
    {
      id: "completed",
      label: "Summarized",
      icon: CheckCircle2,
      count: tabCounts.completed,
      activeClass: "bg-emerald-50 text-emerald-800 border-emerald-300",
    },
    {
      id: "processing",
      label: "In Progress",
      icon: Loader2,
      count: tabCounts.processing,
      activeClass: "bg-amber-50 text-amber-800 border-amber-300",
    },
    {
      id: "failed",
      label: "Failed",
      icon: AlertTriangle,
      count: tabCounts.failed,
      activeClass: "bg-red-50 text-red-800 border-red-300",
    },
  ];

  const hasActiveFilters =
    !!searchQuery || statusFilter !== "all" || channelFilter !== "all";

  const handleToggleSelect = (video) => {
    const vid = video?.video_id;
    if (!vid) return;
    setSelectedVideoIds((prev) => {
      const next = new Set(prev);
      if (next.has(vid)) next.delete(vid);
      else next.add(vid);
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    setSelectedVideoIds(
      new Set(filteredSummaries.map((v) => v?.video_id).filter(Boolean)),
    );
  };

  const handleClearSelection = () => {
    setSelectedVideoIds(new Set());
  };

  const handleRequestSelected = async () => {
    const selectedVideos = summaries.filter(
      (v) => v?.video_id && selectedVideoIds.has(v.video_id),
    );
    if (selectedVideos.length === 0) return;

    try {
      setRequestingSelected(true);
      const res = await requestVideoSummaries(selectedVideos);
      if (res?.mode === "instant") {
        const results = res.results || [];
        const failedCount = results.filter((r) => r.status === "failed").length;
        const okCount = results.filter((r) => r.status === "completed").length;
        if (failedCount > 0 && okCount === 0) {
          toast.error(
            results[0]?.error ||
              `Failed to generate summary for ${failedCount} video(s).`,
          );
        } else if (failedCount > 0) {
          toast.success(
            `Generated ${okCount} summary(ies); ${failedCount} failed.`,
          );
        } else {
          toast.success(
            `Generated summary for ${okCount || selectedVideos.length} selected video(s).`,
          );
        }
      } else if (res?.mode === "worker") {
        toast.success(
          `Started immediate summarization for ${selectedVideos.length} selected video(s).`,
        );
      } else {
        toast.success(
          `Queued ${selectedVideos.length} selected video(s) for summarization.`,
        );
      }
      setSelectionMode(false);
      setSelectedVideoIds(new Set());
    } catch (err) {
      toast.error(err?.message || "Failed to request summary.");
    } finally {
      setRequestingSelected(false);
    }
  };

  return (
    <Layout>
      <title>Library — TubeDigest</title>

      {/* Page Header */}
      <div className="mb-7 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Library className="w-4 h-4 text-stone-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Library
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900 mb-1.5">
              Summary Library
            </h1>
            <p className="text-sm text-stone-600 max-w-2xl leading-relaxed">
              Browse, search, and filter all video digests across your tracked
              channels.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              id="library-toggle-select-btn"
              type="button"
              onClick={() => {
                setSelectionMode((v) => !v);
                setSelectedVideoIds(new Set());
              }}
              className={`btn-secondary text-xs py-2.5 px-3.5 ${
                selectionMode ? "border-stone-900 text-stone-900 bg-stone-100" : ""
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              {selectionMode ? "Exit Selection" : "Select Videos"}
            </button>

            <button
              id="library-request-summary-btn"
              type="button"
              onClick={() => setRequestModalOpen(true)}
              className="btn-primary text-xs py-2.5 px-4"
            >
              <ListPlus className="w-4 h-4" />
              Request Summary
            </button>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-card p-5 mb-7 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3.5 justify-between lg:items-center">
          {/* Search + Channel Filter */}
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative flex-1 sm:max-w-sm group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-stone-800 transition-colors" />
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
                <Tv className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                <select
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value)}
                  className="input-light pl-10 pr-8 appearance-none cursor-pointer bg-white"
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
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap cursor-pointer transition-all border shrink-0 ${
                    isActive
                      ? `${tab.activeClass} shadow-xs`
                      : "bg-[#f7f6f2] text-stone-600 border-[#e5e2d9] hover:bg-stone-200/60 hover:text-stone-900"
                  }`}
                >
                  <tab.icon
                    className={`w-4 h-4 ${isActive && tab.id === "processing" ? "animate-spin" : ""}`}
                  />
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        isActive
                          ? tab.id === "all"
                            ? "bg-white/20 text-white"
                            : "bg-white/80 text-current"
                          : "bg-stone-200/80 text-stone-700"
                      }`}
                    >
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
          <div className="flex items-center gap-3 bg-[#f7f6f2] px-3.5 py-1.5 rounded-lg w-fit border border-[#e6e3dc]">
            <span className="text-xs font-medium text-stone-600">
              Showing{" "}
              <span className="text-stone-900 font-semibold">
                {filteredSummaries.length}
              </span>{" "}
              of {summaries.length} loaded videos
            </span>
            <span className="w-px h-3 bg-stone-300" />
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setChannelFilter("all");
              }}
              className="text-xs font-semibold cursor-pointer transition-colors text-blue-700 hover:text-blue-800"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Batch selection toolbar */}
      {selectionMode && (
        <div className="glass-card p-4 mb-6 flex flex-wrap items-center justify-between gap-3 border-blue-200 bg-blue-50/70 animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-stone-900">
              {selectedVideoIds.size} video
              {selectedVideoIds.size === 1 ? "" : "s"} selected
            </span>
            {filteredSummaries.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAllVisible}
                className="text-xs font-semibold text-blue-700 hover:text-blue-900 cursor-pointer underline underline-offset-2"
              >
                Select all visible ({filteredSummaries.length})
              </button>
            )}
            {selectedVideoIds.size > 0 && (
              <button
                type="button"
                onClick={handleClearSelection}
                className="text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer inline-flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>

          <button
            id="library-submit-selected-btn"
            type="button"
            disabled={selectedVideoIds.size === 0 || requestingSelected}
            onClick={handleRequestSelected}
            className="btn-primary text-xs py-2 px-4"
          >
            {requestingSelected ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Requesting…
              </>
            ) : (
              <>
                <ListPlus className="w-3.5 h-3.5" />
                Request Summary ({selectedVideoIds.size})
              </>
            )}
          </button>
        </div>
      )}

      {/* Results or empty filtered state */}
      {filteredSummaries.length === 0 && !summariesLoading && hasActiveFilters ? (
        <div className="glass-card p-14 text-center">
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl flex items-center justify-center bg-stone-100 border border-stone-200 text-stone-500">
            <Filter className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold mb-2 text-stone-900">
            No matching videos
          </h3>
          <p className="text-sm text-stone-500 mb-6">
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
          selectable={selectionMode}
          selectedVideoIds={selectedVideoIds}
          onToggleSelect={handleToggleSelect}
        />
      )}
    </Layout>
  );
}
