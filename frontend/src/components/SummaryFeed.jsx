import { RefreshCw, Zap, FileText, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import SummaryCard from "./SummaryCard";

export default function SummaryFeed({
  summaries,
  channels,
  loading,
  hasMore,
  onLoadMore,
  onRefresh,
  limit,
  onRetry,
}) {
  const channelMap = {};
  for (const ch of channels) {
    const id = ch.channel_id ?? ch.data?.channel_id;
    const name = ch.name ?? ch.data?.name;
    if (id) channelMap[id] = name || id;
  }

  const displaySummaries = limit ? summaries.slice(0, limit) : summaries;

  return (
    <div className="space-y-6">
      {/* Feed header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.3)]"
            style={{ background: 'linear-gradient(135deg, var(--color-accent-600), var(--color-indigo-600))' }}
          >
            <Zap className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-wide">
            Latest Summaries
          </h2>
          {summaries.length > 0 && (
            <span className="badge badge-blue ml-2">
              {summaries.length}
            </span>
          )}
        </div>
        <button
          id="refresh-feed-btn"
          onClick={onRefresh}
          disabled={loading}
          className="btn-secondary text-xs py-2 px-4 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Empty state */}
      {!loading && summaries.length === 0 && (
        <div className="glass-card p-16 text-center animate-fade-in-up">
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl flex items-center justify-center bg-white/5 border border-white/10 relative shadow-2xl">
            <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full"></div>
            <FileText className="w-10 h-10 text-blue-400 relative z-10" />
          </div>
          <h3 className="text-xl font-bold text-white mb-3 tracking-wide">
            No summaries yet
          </h3>
          <p className="text-sm text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
            Add YouTube channels to your watchlist. The AI worker processes new uploads every hour and generates summaries automatically using Gemini 2.0.
          </p>
          <Link
            to="/channels"
            className="btn-primary inline-flex text-sm py-3 px-6 shadow-[0_0_20px_rgba(59,130,246,0.2)]"
          >
            <Plus className="w-4 h-4" />
            Add your first channel
          </Link>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && summaries.length === 0 && (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="glass-card p-6"
            >
              <div className="flex gap-5">
                <div className="skeleton rounded-xl shrink-0" style={{ width: '160px', height: '90px' }} />
                <div className="flex-1 space-y-4 pt-2">
                  <div className="skeleton h-4 rounded-lg w-3/4" />
                  <div className="skeleton h-3 rounded-lg w-1/2" />
                  <div className="skeleton h-3 rounded-lg w-1/3" />
                </div>
              </div>
              <div className="mt-6 pt-5 space-y-3 border-t border-white/5">
                <div className="skeleton h-3.5 rounded-lg w-full" />
                <div className="skeleton h-3.5 rounded-lg w-11/12" />
                <div className="skeleton h-3.5 rounded-lg w-4/5" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary cards */}
      {displaySummaries.length > 0 && (
        <div className="space-y-6">
          {displaySummaries.map((video, index) => (
            <SummaryCard
              key={video.$id ?? video.id}
              video={video}
              channelName={channelMap[video.channel_id] || ""}
              index={index}
              onRetry={onRetry}
            />
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && displaySummaries.length > 0 && (
        <div className="flex justify-center pt-6 pb-8">
          <button
            id="load-more-btn"
            onClick={onLoadMore}
            disabled={loading}
            className="btn-secondary px-8 py-3 text-sm cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading...
              </span>
            ) : (
              "Load More"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
