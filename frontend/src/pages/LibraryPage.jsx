import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useChannels } from "../hooks/useChannels";
import { useSummaries } from "../hooks/useSummaries";
import Layout from "../components/Layout";
import SummaryFeed from "../components/SummaryFeed";
import { Search, Library, PlayCircle, AlertTriangle, CheckCircle2, Loader2, Filter } from "lucide-react";

export default function LibraryPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { channels } = useChannels();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const subscribedChannelIds = useMemo(
    () => channels.map((ch) => ch.channel_id ?? ch.data?.channel_id).filter(Boolean),
    [channels]
  );

  const {
    summaries,
    loading: summariesLoading,
    hasMore,
    loadMore,
    refresh,
    retrySummary,
  } = useSummaries(subscribedChannelIds);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Filter summaries based on search query and status
  const filteredSummaries = useMemo(() => {
    return summaries.filter((video) => {
      if (statusFilter !== "all" && video.status !== statusFilter) return false;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const titleMatch = video.title?.toLowerCase().includes(query);
        const match = channels.find((c) => {
          const cid = c.channel_id ?? c.data?.channel_id;
          return cid === video.channel_id;
        });
        const channelName = (match?.name ?? match?.data?.name ?? "").toLowerCase();
        const channelMatch = channelName.includes(query);
        return titleMatch || channelMatch;
      }

      return true;
    });
  }, [summaries, searchQuery, statusFilter, channels]);

  const stats = useMemo(() => ({
    all: summaries.length,
    completed: summaries.filter(s => s.status === "completed").length,
    processing: summaries.filter(s => s.status === "processing" || s.status === "pending").length,
    failed: summaries.filter(s => s.status === "failed").length,
  }), [summaries]);

  if (authLoading) return null;
  if (!isAuthenticated) return null;

  const tabs = [
    {
      id: "all",
      label: "All",
      icon: PlayCircle,
      count: stats.all,
      activeStyle: { background: 'var(--color-surface-800)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' },
    },
    {
      id: "completed",
      label: "Summarized",
      icon: CheckCircle2,
      count: stats.completed,
      activeStyle: { background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)' },
    },
    {
      id: "processing",
      label: "Processing",
      icon: Loader2,
      count: stats.processing,
      activeStyle: { background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)' },
    },
    {
      id: "failed",
      label: "Failed",
      icon: AlertTriangle,
      count: stats.failed,
      activeStyle: { background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)' },
    },
  ];

  return (
    <Layout>
      <title>Library — TubeDigest</title>

      {/* Page Header */}
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center gap-2 mb-2">
          <Library className="w-5 h-5 text-blue-400" />
          <span className="text-xs font-bold uppercase tracking-widest text-blue-400">
            Library
          </span>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
          Summary Library
        </h1>
        <p className="text-sm text-gray-400 max-w-2xl leading-relaxed">
          Your complete archive of AI-generated video summaries.
        </p>
      </div>

      {/* Filters Bar */}
      <div className="glass-card p-5 mb-8">
        <div className="flex flex-col xl:flex-row gap-4 justify-between xl:items-center">

          {/* Search */}
          <div className="relative w-full xl:max-w-sm shrink-0 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
            <input
              type="text"
              placeholder="Search by title or channel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-light pl-10"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex gap-3 overflow-x-auto sidebar-scroll pb-2 md:pb-0">
            {tabs.map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap cursor-pointer transition-all duration-200 shrink-0"
                  style={isActive
                    ? { ...tab.activeStyle, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }
                    : {
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: 'var(--color-surface-400)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                      }
                  }
                >
                  <tab.icon className={`w-4 h-4 ${isActive && tab.id === 'processing' ? 'animate-spin' : ''}`} />
                  {tab.label}
                  {tab.count > 0 && (
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md min-w-[24px] text-center ml-1"
                      style={isActive
                        ? { background: 'rgba(255,255,255,0.15)', color: 'inherit' }
                        : { background: 'rgba(255,255,255,0.1)', color: 'var(--color-surface-300)' }
                      }
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
        {(searchQuery || statusFilter !== 'all') && (
          <div className="mt-4 flex items-center gap-3 bg-white/5 px-4 py-2 rounded-lg w-fit border border-white/5">
            <span className="text-xs font-semibold text-gray-400">
              Showing <span className="text-white">{filteredSummaries.length}</span> of {summaries.length} summaries
            </span>
            <div className="w-px h-3 bg-white/20"></div>
            <button
              onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
              className="text-xs font-bold cursor-pointer transition-colors text-blue-400 hover:text-blue-300"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* No results state */}
      {filteredSummaries.length === 0 && !summariesLoading ? (
        <div className="glass-card p-16 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center bg-white/5 border border-white/10 relative">
            <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full"></div>
            <Filter className="w-8 h-8 text-gray-400 relative z-10" />
          </div>
          <h3 className="text-xl font-bold mb-2 text-gray-200">No matching videos</h3>
          <p className="text-sm text-gray-400 mb-6">Try adjusting your search or filters.</p>
          <button
            onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
            className="btn-secondary text-sm"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <SummaryFeed
          summaries={filteredSummaries}
          channels={channels}
          loading={summariesLoading}
          hasMore={hasMore && statusFilter === "all" && !searchQuery}
          onLoadMore={loadMore}
          onRefresh={refresh}
          onRetry={retrySummary}
        />
      )}
    </Layout>
  );
}
