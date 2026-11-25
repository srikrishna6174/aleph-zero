import { RefreshCw, Zap, FileText, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import SummaryCard from "./SummaryCard";

export default function SummaryFeed({
  summaries = [],
  channels = [],
  loading = false,
  hasMore = false,
  onLoadMore,
  onRefresh,
  limit,
  onRetry,
  showHeader = true,
  title = "Latest Summaries",
  selectable = false,
  selectedVideoIds = null,
  onToggleSelect,
}) {
  const safeChannels = Array.isArray(channels) ? channels : [];
  const safeSummaries = Array.isArray(summaries) ? summaries : [];

  const channelMap = {};
  for (const ch of safeChannels) {
    if (!ch) continue;
    const id = ch.channel_id ?? ch.data?.channel_id;
    const name = ch.name ?? ch.data?.name;
    const avatar = ch.thumbnail_url ?? ch.data?.thumbnail_url ?? "";
    if (id) {
      channelMap[id] = {
        name: name && name !== id ? name : `Channel ${id.substring(0, 8)}…`,
        avatar,
      };
    }
  }

  const displaySummaries = limit
    ? safeSummaries.slice(0, limit)
    : safeSummaries;

  return (
    <div className="space-y-5">
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-600 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-wide">
              {title}
            </h2>
            {safeSummaries.length > 0 && (
              <span className="badge badge-blue">{safeSummaries.length}</span>
            )}
          </div>
          {onRefresh && (
            <button
              id="refresh-feed-btn"
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="btn-secondary text-xs py-2 px-3.5"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          )}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && safeSummaries.length === 0 && (
        <div className="space-y-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-6">
              <div className="flex flex-col sm:flex-row gap-5">
                <div className="skeleton rounded-xl shrink-0 w-full sm:w-[176px] h-[99px]" />
                <div className="flex-1 space-y-3 pt-1">
                  <div className="skeleton h-4 rounded-lg w-3/4" />
                  <div className="skeleton h-3 rounded-lg w-1/2" />
                  <div className="skeleton h-3 rounded-lg w-1/3" />
                </div>
              </div>
              <div className="mt-5 pt-4 space-y-2.5 border-t border-white/5">
                <div className="skeleton h-3.5 rounded-lg w-full" />
                <div className="skeleton h-3.5 rounded-lg w-11/12" />
                <div className="skeleton h-3.5 rounded-lg w-4/5" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && safeSummaries.length === 0 && (
        <div className="glass-card p-12 sm:p-16 text-center animate-fade-in-up">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center bg-white/[0.05] border border-white/10 relative">
            <div className="absolute inset-0 bg-blue-500/15 blur-xl rounded-full" />
            <FileText className="w-8 h-8 text-blue-400 relative z-10" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2.5">
            No summaries yet
          </h3>
          <p className="text-sm text-zinc-400 mb-7 max-w-md mx-auto leading-relaxed">
            Add YouTube channels to your watchlist. The AI worker fetches new
            uploads and generates structured summaries powered by Gemini 3.6
            Flash.
          </p>
          <Link to="/channels" className="btn-primary text-sm">
            <Plus className="w-4 h-4" />
            Add your first channel
          </Link>
        </div>
      )}

      {/* Summary cards */}
      {displaySummaries.length > 0 && (
        <div className="space-y-5">
          {displaySummaries.map((video, index) => {
            const info = channelMap[video.channel_id] || {};
            return (
              <SummaryCard
                key={video.$id ?? video.id}
                video={video}
                channelName={info.name || ""}
                channelAvatar={info.avatar || ""}
                index={index}
                onRetry={onRetry}
                selectable={selectable}
                selected={!!selectedVideoIds?.has(video.video_id)}
                onToggleSelect={onToggleSelect}
              />
            );
          })}
        </div>
      )}

      {/* Load more */}
      {hasMore && displaySummaries.length > 0 && (
        <div className="flex justify-center pt-4 pb-6">
          <button
            id="load-more-btn"
            type="button"
            onClick={onLoadMore}
            disabled={loading}
            className="btn-secondary px-8 py-3 text-sm"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Loading…
              </span>
            ) : (
              "Load More Summaries"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
