/**
 * SummaryCard Component
 * ======================
 * Rich card displaying a video's AI-generated summary.
 * Light theme with clean typography and hover effects.
 */

import { useState } from "react";
import { ExternalLink, Clock, User, Zap, RotateCcw, AlertTriangle, Loader2, Timer } from "lucide-react";

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
 * Status badge config for light theme.
 */
function getStatusBadge(status) {
  switch (status) {
    case "completed":
      return {
        label: "Summarized",
        bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0',
        dot: '#10b981',
      };
    case "processing":
      return {
        label: "Processing...",
        bg: '#fffbeb', color: '#b45309', border: '#fde68a',
        dot: '#f59e0b',
      };
    case "pending":
      return {
        label: "Queued",
        bg: '#f0f9ff', color: '#0369a1', border: '#bae6fd',
        dot: '#0ea5e9',
      };
    case "failed":
      return {
        label: "Failed",
        bg: '#fef2f2', color: '#b91c1c', border: '#fecaca',
        dot: '#ef4444',
      };
    default:
      return {
        label: status,
        bg: 'var(--color-surface-100)', color: 'var(--color-surface-500)', border: 'var(--color-surface-200)',
        dot: 'var(--color-surface-400)',
      };
  }
}

export default function SummaryCard({ video, channelName, index = 0, onRetry }) {
  const [expanded, setExpanded] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const badge = getStatusBadge(video.status);

  const thumbnailUrl =
    video.thumbnail_url ||
    `https://i.ytimg.com/vi/${video.video_id}/hqdefault.jpg`;

  const videoUrl = `https://www.youtube.com/watch?v=${video.video_id}`;

  const handleRetry = async () => {
    if (retrying || !onRetry) return;
    setRetrying(true);
    try {
      const { toast } = await import('react-hot-toast');
      await toast.promise(onRetry(video.$id ?? video.id), {
        loading: 'Re-queueing summary...',
        success: 'Successfully re-queued for processing!',
        error: 'Failed to re-queue. Please try again.',
      });
    } finally {
      setRetrying(false);
    }
  };

  return (
    <article
      className="animate-fade-in-up rounded-2xl overflow-hidden"
      style={{
        animationDelay: `${index * 0.07}s`,
        opacity: 0,
        background: '#ffffff',
        border: '1px solid var(--color-surface-200)',
        boxShadow: '0 1px 4px rgba(15,23,42,0.06)',
        transition: 'all 0.22s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 6px 24px rgba(15,23,42,0.1)';
        e.currentTarget.style.borderColor = 'var(--color-surface-300)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 1px 4px rgba(15,23,42,0.06)';
        e.currentTarget.style.borderColor = 'var(--color-surface-200)';
        e.currentTarget.style.transform = '';
      }}
    >
      {/* Status stripe at top */}
      <div className="h-0.5 w-full" style={{ background: badge.dot === '#10b981' ? 'linear-gradient(90deg, #10b981, #34d399)' : badge.dot === '#ef4444' ? 'linear-gradient(90deg, #ef4444, #f87171)' : badge.dot === '#f59e0b' ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'var(--color-surface-100)' }} />

      {/* Main content */}
      <div className="flex gap-4 p-5">
        {/* Thumbnail */}
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 group/thumb"
          style={{ display: 'block' }}
        >
          <div className="relative rounded-xl overflow-hidden" style={{ width: '160px', height: '90px', background: 'var(--color-surface-100)' }}>
            <img
              src={thumbnailUrl}
              alt={video.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover/thumb:scale-105"
              loading="lazy"
              onError={e => { e.currentTarget.style.display = 'none'; }}
            />
            {/* Play overlay */}
            <div
              className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity duration-200"
              style={{ background: 'rgba(0,0,0,0.35)' }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shadow-lg"
                style={{ background: '#ff0000' }}
              >
                <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </div>
        </a>

        {/* Title + metadata */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-sm leading-snug line-clamp-2 transition-colors"
              style={{ color: 'var(--color-surface-900)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent-600)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-surface-900)'; }}
            >
              {video.title}
            </a>

            {/* Status badge */}
            <span
              className="shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5"
              style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: badge.dot }} />
              {badge.label}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--color-surface-400)' }}>
            {channelName && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span className="font-medium" style={{ color: 'var(--color-surface-600)' }}>{channelName}</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatRelativeTime(video.published_at)}
            </span>
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 transition-colors hover:text-accent-500"
              style={{ color: 'var(--color-surface-400)' }}
            >
              <ExternalLink className="w-3 h-3" />
              Watch
            </a>
          </div>
        </div>
      </div>

      {/* ── AI Summary (completed) ── */}
      {video.status === "completed" && video.ai_summary && (
        <div className="px-5 pb-5">
          <div className="rounded-xl p-4" style={{ background: 'var(--color-surface-50)', border: '1px solid var(--color-surface-100)' }}>
            <div className="flex items-center gap-2 mb-2.5">
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #2563eb, #6366f1)' }}
              >
                <Zap className="w-3 h-3 text-white" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-accent-600)' }}>
                AI Summary
              </span>
            </div>

            <div
              className="text-sm leading-relaxed whitespace-pre-wrap"
              style={{
                color: 'var(--color-surface-700)',
                display: !expanded ? '-webkit-box' : 'block',
                WebkitLineClamp: !expanded ? 6 : 'unset',
                WebkitBoxOrient: 'vertical',
                overflow: !expanded ? 'hidden' : 'visible',
              }}
            >
              {video.ai_summary}
            </div>

            {video.ai_summary.length > 400 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-3 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                style={{ color: 'var(--color-accent-600)' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent-800)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-accent-600)'; }}
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

      {/* ── Processing state ── */}
      {video.status === "processing" && (
        <div className="px-5 pb-5">
          <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
            <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: '#f59e0b' }} />
            <span className="text-sm font-medium" style={{ color: '#b45309' }}>AI is generating the summary…</span>
          </div>
        </div>
      )}

      {/* ── Pending state ── */}
      {video.status === "pending" && (
        <div className="px-5 pb-5">
          <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
            <Timer className="w-4 h-4 shrink-0" style={{ color: '#0ea5e9' }} />
            <span className="text-sm font-medium" style={{ color: '#0369a1' }}>Queued for processing — will run next hour</span>
          </div>
        </div>
      )}

      {/* ── Failed state ── */}
      {video.status === "failed" && (
        <div className="px-5 pb-5">
          <div className="rounded-xl px-4 py-3 flex items-center justify-between gap-3" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: '#ef4444' }} />
              <span className="text-sm truncate" style={{ color: '#b91c1c' }}>
                {video.error_message || "Failed to generate summary"}
              </span>
            </div>

            {onRetry && (
              <button
                onClick={handleRetry}
                disabled={retrying}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                style={{
                  background: '#ffffff',
                  color: '#b91c1c',
                  border: '1px solid #fecaca',
                  opacity: retrying ? 0.7 : 1,
                }}
                onMouseEnter={e => { if (!retrying) { e.currentTarget.style.background = '#fff0f0'; }}}
                onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; }}
              >
                <RotateCcw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
                {retrying ? 'Retrying...' : 'Retry'}
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
