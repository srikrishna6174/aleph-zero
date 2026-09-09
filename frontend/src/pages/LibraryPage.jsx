/**
 * LibraryPage
 * ============
 * Advanced summary history view with filtering and search.
 */

import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useChannels } from "../hooks/useChannels";
import { useSummaries } from "../hooks/useSummaries";
import Layout from "../components/Layout";
import SummaryFeed from "../components/SummaryFeed";
import { Search, Filter, PlayCircle, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

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
      // Status filter
      if (statusFilter !== "all" && video.status !== statusFilter) return false;
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const titleMatch = video.title?.toLowerCase().includes(query);
        
        // Find channel name safely (works with direct fields or nested data)
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
    failed: summaries.filter(s => s.status === "failed").length
  }), [summaries]);

  if (authLoading) return null;
  if (!isAuthenticated) return null;

  const tabs = [
    { id: "all", label: "All Videos", icon: PlayCircle, count: stats.all },
    { id: "completed", label: "Summarized", icon: CheckCircle2, count: stats.completed },
    { id: "processing", label: "Processing", icon: Loader2, count: stats.processing },
    { id: "failed", label: "Failed", icon: AlertTriangle, count: stats.failed },
  ];

  return (
    <Layout>
      <title>Library — TubeDigest</title>
      
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold text-surface-100 tracking-tight">
          Summary Library
        </h1>
        <p className="text-surface-400 mt-2">
          Your complete archive of AI-generated summaries.
        </p>
      </div>

      {/* Advanced Filters */}
      <div className="bg-surface-800/40 rounded-2xl border border-surface-700/50 p-4 mb-8">
        <div className="flex flex-col xl:flex-row gap-4 justify-between xl:items-center">
          
          {/* Search Bar */}
          <div className="relative w-full xl:max-w-md shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input 
              type="text" 
              placeholder="Search by title or channel..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-900 border border-surface-700 rounded-xl py-2.5 pr-4 text-sm text-surface-100 placeholder-surface-500 focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/50 transition-all"
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>

          {/* Status Tabs */}
          <div className="flex overflow-x-auto sidebar-scroll pb-2 md:pb-0 gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  statusFilter === tab.id 
                    ? "bg-accent-500 text-white shadow-md shadow-accent-500/20" 
                    : "bg-surface-900/50 text-surface-400 hover:text-surface-200 hover:bg-surface-800"
                }`}
              >
                <tab.icon className={`w-4 h-4 ${statusFilter === tab.id ? "" : "text-surface-500"}`} />
                {tab.label}
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                  statusFilter === tab.id ? "bg-white/20" : "bg-surface-800"
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Feed */}
      {filteredSummaries.length === 0 && !summariesLoading ? (
        <div className="glass rounded-xl p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-800 flex items-center justify-center border border-surface-700/50">
            <Filter className="w-8 h-8 text-surface-500" />
          </div>
          <h3 className="text-base font-semibold text-surface-200 mb-2">No matching videos</h3>
          <p className="text-sm text-surface-500">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <SummaryFeed
          summaries={filteredSummaries}
          channels={channels}
          loading={summariesLoading}
          hasMore={hasMore && statusFilter === "all" && !searchQuery} // Only allow pagination when no local filters active
          onLoadMore={loadMore}
          onRefresh={refresh}
          onRetry={retrySummary}
        />
      )}
    </Layout>
  );
}
