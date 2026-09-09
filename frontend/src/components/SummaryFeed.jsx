/**
 * SummaryFeed Component
 * ======================
 * Main dashboard feed displaying AI summaries with
 * infinite scroll pagination and real-time updates.
 */

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
  // Build a quick channel_id → name lookup map
  const channelMap = {};
  for (const ch of channels) {
    // TablesDB rows expose fields directly on the row object
    const id = ch.channel_id ?? ch.data?.channel_id;
    const name = ch.name ?? ch.data?.name;
    if (id) channelMap[id] = name || id;
  }

  const displaySummaries = limit ? summaries.slice(0, limit) : summaries;

  return (
    <div className="space-y-4">
      {/* Feed header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-surface-100 flex items-center gap-2">
          <svg className="w-5 h-5 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Latest Summaries
        </h2>
        <button
          id="refresh-feed-btn"
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-surface-400 hover:text-surface-200 bg-surface-800/60 hover:bg-surface-700/60 border border-surface-700/50 rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-50"
        >
          <svg
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </div>

      {/* Empty state */}
      {!loading && summaries.length === 0 && (
        <div className="glass rounded-xl p-12 text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent-600/20 to-info/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-surface-200 mb-2">
            No summaries yet
          </h3>
          <p className="text-sm text-surface-500 max-w-sm mx-auto">
            Add some YouTube channels to your watchlist. The AI worker processes new uploads every hour and generates summaries automatically.
          </p>
        </div>
      )}

      {/* Loading skeleton (initial load) */}
      {loading && summaries.length === 0 && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-xl p-5">
              <div className="flex gap-4">
                <div className="skeleton w-40 h-[90px] rounded-lg shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="skeleton h-4 w-3/4 rounded" />
                  <div className="skeleton h-3 w-1/2 rounded" />
                  <div className="skeleton h-3 w-1/3 rounded" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-surface-700/50 space-y-2">
                <div className="skeleton h-3 w-full rounded" />
                <div className="skeleton h-3 w-5/6 rounded" />
                <div className="skeleton h-3 w-4/6 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary cards */}
      {displaySummaries.length > 0 && (
        <div className="space-y-4">
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
        <div className="flex justify-center pt-4">
          <button
            id="load-more-btn"
            onClick={onLoadMore}
            disabled={loading}
            className="px-6 py-2.5 text-sm font-medium text-surface-300 hover:text-surface-100 bg-surface-800/60 hover:bg-surface-700/60 border border-surface-700/50 rounded-xl transition-all duration-200 disabled:opacity-50 cursor-pointer"
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
