/**
 * SummaryCard Component
 * ======================
 * Rich card displaying a video's AI-generated summary
 * with thumbnail, metadata, and expandable view.
 */

import { useState } from "react";

/**
 * Format an ISO date string into a human-readable relative time.
 */
function formatRelativeTime(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Get a status badge configuration.
 */
function getStatusBadge(status) {
  switch (status) {
    case "completed":
      return { label: "Summarized", color: "bg-success/15 text-success border-success/30" };
    case "processing":
      return { label: "Processing...", color: "bg-warning/15 text-warning border-warning/30" };
    case "pending":
      return { label: "Pending", color: "bg-info/15 text-info border-info/30" };
    case "failed":
      return { label: "Failed", color: "bg-error/15 text-error border-error/30" };
    default:
      return { label: status, color: "bg-surface-700 text-surface-400 border-surface-600" };
  }
}

export default function SummaryCard({ video, channelName, index = 0, onRetry }) {
  const [expanded, setExpanded] = useState(false);
  const badge = getStatusBadge(video.status);

  const thumbnailUrl =
    video.thumbnail_url ||
    `https://i.ytimg.com/vi/${video.video_id}/hqdefault.jpg`;

  const videoUrl = `https://www.youtube.com/watch?v=${video.video_id}`;

  return (
    <article
      className="glass rounded-xl overflow-hidden hover:border-accent-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-accent-500/5 animate-fade-in-up"
      style={{ animationDelay: `${index * 0.08}s`, opacity: 0 }}
    >
      {/* Thumbnail + metadata header */}
      <div className="flex gap-4 p-5">
        {/* Thumbnail */}
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 group/thumb"
        >
          <div className="relative w-40 h-[90px] rounded-lg overflow-hidden bg-surface-800">
            <img
              src={thumbnailUrl}
              alt={video.title}
              className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            {/* Play overlay */}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/thumb:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-yt-red flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </div>
        </a>

        {/* Title + metadata */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-surface-100 font-semibold text-sm leading-snug hover:text-accent-400 transition-colors line-clamp-2"
            >
              {video.title}
            </a>
            <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${badge.color}`}>
              {badge.label}
            </span>
          </div>

          <div className="mt-2 flex items-center gap-3 text-xs text-surface-400">
            {channelName && (
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                </svg>
                {channelName}
              </span>
            )}
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatRelativeTime(video.published_at)}
            </span>
          </div>
        </div>
      </div>

      {/* AI Summary */}
      {video.status === "completed" && video.ai_summary && (
        <div className="px-5 pb-5">
          <div className="border-t border-surface-700/50 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-md bg-gradient-to-br from-accent-500 to-info flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-surface-300 uppercase tracking-wider">
                AI Summary
              </span>
            </div>

            <div
              className={`text-sm text-surface-300 leading-relaxed whitespace-pre-wrap ${
                !expanded ? "line-clamp-6" : ""
              }`}
            >
              {video.ai_summary}
            </div>

            {video.ai_summary.length > 400 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-3 text-xs text-accent-400 hover:text-accent-300 font-medium transition-colors cursor-pointer flex items-center gap-1"
              >
                {expanded ? (
                  <>
                    Show less
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                    </svg>
                  </>
                ) : (
                  <>
                    Read full summary
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Processing state */}
      {video.status === "processing" && (
        <div className="px-5 pb-5">
          <div className="border-t border-surface-700/50 pt-4">
            <div className="flex items-center gap-3 text-sm text-surface-400">
              <svg className="animate-spin w-4 h-4 text-warning" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              AI is generating the summary...
            </div>
          </div>
        </div>
      )}

      {/* Failed state */}
      {video.status === "failed" && (
        <div className="px-5 pb-5">
          <div className="border-t border-surface-700/50 pt-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-error/80 flex-1 min-w-0 pr-4">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="truncate">
                {video.error_message || "Failed to generate summary"}
              </span>
            </div>
            
            {onRetry && (
              <button 
                onClick={async () => {
                  const { toast } = await import('react-hot-toast');
                  toast.promise(onRetry(video.$id ?? video.id), {
                    loading: 'Re-queueing summary...',
                    success: 'Successfully re-queued for processing!',
                    error: 'Failed to re-queue. Please try again.'
                  });
                }}
                className="shrink-0 px-3 py-1.5 text-xs font-medium text-surface-200 bg-surface-800 hover:bg-surface-700 border border-surface-700 hover:border-surface-600 rounded-lg transition-all flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      {/* Pending state */}
      {video.status === "pending" && (
        <div className="px-5 pb-5">
          <div className="border-t border-surface-700/50 pt-4">
            <div className="flex items-center gap-2 text-sm text-surface-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Queued for processing...
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
