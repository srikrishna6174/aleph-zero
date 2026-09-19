/**
 * SummaryFeed Component
 * ======================
 * Main dashboard feed displaying AI summaries with
 * infinite scroll pagination and real-time updates.
 */

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
  // Build a quick channel_id → name lookup map
  const channelMap = {};
  for (const ch of channels) {
    const id = ch.channel_id ?? ch.data?.channel_id;
    const name = ch.name ?? ch.data?.name;
    if (id) channelMap[id] = name || id;
  }

  const displaySummaries = limit ? summaries.slice(0, limit) : summaries;

  return (
    <div className="space-y-4">
      {/* Feed header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--color-accent-500), var(--color-indigo-500))' }}
          >
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <h2 className="text-base font-bold" style={{ color: 'var(--color-surface-900)' }}>
            Latest Summaries
          </h2>
          {summaries.length > 0 && (
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--color-accent-50)', color: 'var(--color-accent-700)', border: '1px solid var(--color-accent-200)' }}
            >
              {summaries.length}
            </span>
          )}
        </div>
        <button
          id="refresh-feed-btn"
          onClick={onRefresh}
          disabled={loading}
          className="btn-secondary text-xs py-1.5 px-3 cursor-pointer disabled:opacity-50"
          style={{ fontSize: '12px', borderRadius: '8px', padding: '6px 12px' }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Empty state */}
      {!loading && summaries.length === 0 && (
        <div
          className="rounded-2xl p-12 text-center animate-fade-in"
          style={{ background: '#ffffff', border: '1px solid var(--color-surface-200)', boxShadow: '0 1px 4px rgba(15,23,42,0.04)' }}
        >
          <div
            className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--color-accent-50), #ede9fe)' }}
          >
            <FileText className="w-8 h-8" style={{ color: 'var(--color-accent-500)' }} />
          </div>
          <h3 className="text-base font-bold mb-2" style={{ color: 'var(--color-surface-800)' }}>
            No summaries yet
          </h3>
          <p className="text-sm mb-5 max-w-sm mx-auto" style={{ color: 'var(--color-surface-500)' }}>
            Add YouTube channels to your watchlist. The AI worker processes new uploads every hour and generates summaries automatically.
          </p>
          <Link
            to="/channels"
            className="btn-primary inline-flex"
            style={{ borderRadius: '10px', fontSize: '13.5px', padding: '8px 18px' }}
          >
            <Plus className="w-4 h-4" />
            Add your first channel
          </Link>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && summaries.length === 0 && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl p-5"
              style={{ background: '#ffffff', border: '1px solid var(--color-surface-200)', boxShadow: '0 1px 4px rgba(15,23,42,0.04)' }}
            >
              <div className="flex gap-4">
                <div className="skeleton rounded-xl shrink-0" style={{ width: '160px', height: '90px' }} />
                <div className="flex-1 space-y-3 pt-1">
                  <div className="skeleton h-4 rounded-lg" style={{ width: '75%' }} />
                  <div className="skeleton h-3 rounded-lg" style={{ width: '50%' }} />
                  <div className="skeleton h-3 rounded-lg" style={{ width: '35%' }} />
                </div>
              </div>
              <div className="mt-4 pt-4 space-y-2" style={{ borderTop: '1px solid var(--color-surface-100)' }}>
                <div className="skeleton h-3 rounded-lg" style={{ width: '100%' }} />
                <div className="skeleton h-3 rounded-lg" style={{ width: '88%' }} />
                <div className="skeleton h-3 rounded-lg" style={{ width: '72%' }} />
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
        <div className="flex justify-center pt-2">
          <button
            id="load-more-btn"
            onClick={onLoadMore}
            disabled={loading}
            className="btn-secondary px-8 py-2.5 text-sm cursor-pointer disabled:opacity-50"
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
