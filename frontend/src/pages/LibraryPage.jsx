/**
 * LibraryPage
 * ============
 * Advanced summary history view with filtering and search — light theme.
 */

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
      activeStyle: { background: 'var(--color-surface-900)', color: '#fff' },
    },
    {
      id: "completed",
      label: "Summarized",
      icon: CheckCircle2,
      count: stats.completed,
      activeStyle: { background: '#15803d', color: '#fff' },
    },
    {
      id: "processing",
      label: "Processing",
      icon: Loader2,
      count: stats.processing,
      activeStyle: { background: '#b45309', color: '#fff' },
    },
    {
      id: "failed",
      label: "Failed",
      icon: AlertTriangle,
      count: stats.failed,
      activeStyle: { background: '#b91c1c', color: '#fff' },
    },
  ];

  return (
    <Layout>
      <title>Library — TubeDigest</title>

      {/* Page Header */}
      <div className="mb-6 animate-fade-in">
        <div className="flex items-center gap-2 mb-1">
          <Library className="w-5 h-5" style={{ color: 'var(--color-accent-500)' }} />
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-accent-600)' }}>
            Library
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--color-surface-900)' }}>
          Summary Library
        </h1>
        <p className="text-sm mt-2" style={{ color: 'var(--color-surface-500)' }}>
          Your complete archive of AI-generated video summaries.
        </p>
      </div>

      {/* Filters Bar */}
      <div
        className="rounded-2xl p-4 mb-6"
        style={{
          background: '#ffffff',
          border: '1px solid var(--color-surface-200)',
          boxShadow: '0 1px 4px rgba(15,23,42,0.06)',
        }}
      >
        <div className="flex flex-col xl:flex-row gap-3 justify-between xl:items-center">

          {/* Search */}
          <div className="relative w-full xl:max-w-sm shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-surface-400)' }} />
            <input
              type="text"
              placeholder="Search by title or channel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-light"
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>

          {/* Status Tabs */}
          <div className="flex gap-2 overflow-x-auto sidebar-scroll pb-1 md:pb-0">
            {tabs.map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap cursor-pointer transition-all duration-200 shrink-0"
                  style={isActive
                    ? { ...tab.activeStyle, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }
                    : {
                        background: 'var(--color-surface-50)',
                        color: 'var(--color-surface-600)',
                        border: '1px solid var(--color-surface-200)',
                      }
                  }
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--color-surface-100)'; }}}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'var(--color-surface-50)'; }}}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {tab.count > 0 && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-md min-w-[20px] text-center"
                      style={isActive
                        ? { background: 'rgba(255,255,255,0.25)', color: 'inherit' }
                        : { background: 'var(--color-surface-200)', color: 'var(--color-surface-600)' }
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
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--color-surface-400)' }}>
              Showing {filteredSummaries.length} of {summaries.length} summaries
            </span>
            <button
              onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
              className="text-xs font-medium cursor-pointer transition-colors"
              style={{ color: 'var(--color-accent-600)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent-800)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-accent-600)'; }}
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* No results state */}
      {filteredSummaries.length === 0 && !summariesLoading ? (
        <div
          className="rounded-2xl p-12 text-center"
          style={{ background: '#ffffff', border: '1px solid var(--color-surface-200)', boxShadow: '0 1px 4px rgba(15,23,42,0.04)' }}
        >
          <div
            className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--color-surface-100)', border: '1px solid var(--color-surface-200)' }}
          >
            <Filter className="w-7 h-7" style={{ color: 'var(--color-surface-400)' }} />
          </div>
          <h3 className="text-base font-bold mb-2" style={{ color: 'var(--color-surface-800)' }}>No matching videos</h3>
          <p className="text-sm" style={{ color: 'var(--color-surface-500)' }}>Try adjusting your search or filters.</p>
          <button
            onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
            className="btn-secondary mt-4 text-sm cursor-pointer"
            style={{ display: 'inline-flex' }}
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
