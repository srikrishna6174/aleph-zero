import { useState } from "react";
import { ExternalLink, Clock, User, Zap, RotateCcw, AlertTriangle, Loader2, Timer } from "lucide-react";
import toast from "react-hot-toast";

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

function getStatusBadge(status) {
  switch (status) {
    case "completed":
      return {
        label: "Summarized",
        bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: 'rgba(16, 185, 129, 0.3)',
        dot: '#10b981',
      };
    case "processing":
      return {
        label: "Processing...",
        bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)',
        dot: '#f59e0b',
      };
    case "pending":
      return {
        label: "Queued",
        bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)',
        dot: '#3b82f6',
      };
    case "failed":
      return {
        label: "Failed",
        bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: 'rgba(239, 68, 68, 0.3)',
        dot: '#ef4444',
      };
    default:
      return {
        label: status,
        bg: 'rgba(255, 255, 255, 0.05)', color: 'var(--color-surface-400)', border: 'rgba(255, 255, 255, 0.1)',
        dot: 'var(--color-surface-500)',
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
      className="animate-fade-in-up rounded-2xl overflow-hidden glass-card group transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
      style={{
        animationDelay: `${(index % 10) * 0.05}s`,
      }}
    >
      {/* Status stripe at top */}
      <div className="h-[3px] w-full" style={{ background: badge.dot === '#10b981' ? 'linear-gradient(90deg, #10b981, #34d399)' : badge.dot === '#ef4444' ? 'linear-gradient(90deg, #ef4444, #f87171)' : badge.dot === '#f59e0b' ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'rgba(255, 255, 255, 0.1)' }} />

      {/* Main content */}
      <div className="flex gap-5 p-5 sm:p-6">
        {/* Thumbnail */}
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 block"
        >
          <div className="relative rounded-xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.3)] bg-white/5" style={{ width: '160px', height: '90px' }}>
            <img
              src={thumbnailUrl}
              alt={video.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              onError={e => { e.currentTarget.style.display = 'none'; }}
            />
            {/* Play overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40 backdrop-blur-[2px]">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)] scale-90 group-hover:scale-100 transition-transform duration-300">
                <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </div>
        </a>

        {/* Title + metadata */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-start justify-between gap-4 mb-2">
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-base leading-snug line-clamp-2 text-gray-100 transition-colors hover:text-blue-400 tracking-wide"
            >
              {video.title}
            </a>

            {/* Status badge */}
            <span
              className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 uppercase tracking-wider backdrop-blur-md"
              style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0 shadow-[0_0_5px_currentColor]" style={{ background: badge.dot }} />
              {badge.label}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-400 mt-2">
            {channelName && (
              <span className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md">
                <User className="w-3.5 h-3.5" />
                <span className="text-gray-300">{channelName}</span>
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-500" />
              {formatRelativeTime(video.published_at)}
            </span>
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 transition-colors hover:text-blue-400 ml-auto sm:ml-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Watch
            </a>
          </div>
        </div>
      </div>

      {/* ── AI Summary (completed) ── */}
      {video.status === "completed" && video.ai_summary && (
        <div className="px-5 sm:px-6 pb-6 pt-2">
          <div className="rounded-xl p-5 bg-black/20 border border-white/5 relative overflow-hidden group/summary">
            {/* Subtle glow behind summary */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl transition-opacity opacity-50 group-hover/summary:opacity-100"></div>
            
            <div className="flex items-center gap-2 mb-3 relative z-10">
              <div className="w-6 h-6 rounded-md flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-blue-300">
                AI Summary
              </span>
            </div>

            <div
              className="text-sm leading-relaxed text-gray-300 whitespace-pre-wrap relative z-10 font-medium"
              style={{
                display: !expanded ? '-webkit-box' : 'block',
                WebkitLineClamp: !expanded ? 5 : 'unset',
                WebkitBoxOrient: 'vertical',
                overflow: !expanded ? 'hidden' : 'visible',
              }}
            >
              {video.ai_summary}
            </div>

            {video.ai_summary.length > 350 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-4 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors text-blue-400 hover:text-blue-300 uppercase tracking-wider relative z-10"
              >
                {expanded ? (
                  <>
                    Show less
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                    </svg>
                  </>
                ) : (
                  <>
                    Read full summary
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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
        <div className="px-5 sm:px-6 pb-6 pt-2">
          <div className="rounded-xl px-4 py-3.5 flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 backdrop-blur-sm">
            <Loader2 className="w-4 h-4 animate-spin shrink-0 text-amber-400" />
            <span className="text-sm font-semibold text-amber-300 tracking-wide">AI is generating the summary…</span>
          </div>
        </div>
      )}

      {/* ── Pending state ── */}
      {video.status === "pending" && (
        <div className="px-5 sm:px-6 pb-6 pt-2">
          <div className="rounded-xl px-4 py-3.5 flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 backdrop-blur-sm">
            <Timer className="w-4 h-4 shrink-0 text-blue-400" />
            <span className="text-sm font-semibold text-blue-300 tracking-wide">Queued for processing — will run next hour</span>
          </div>
        </div>
      )}

      {/* ── Failed state ── */}
      {video.status === "failed" && (
        <div className="px-5 sm:px-6 pb-6 pt-2">
          <div className="rounded-xl px-4 py-3.5 flex items-center justify-between gap-3 bg-red-500/10 border border-red-500/20 backdrop-blur-sm">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span className="text-sm font-semibold truncate text-red-300 tracking-wide">
                {video.error_message || "Failed to generate summary"}
              </span>
            </div>

            {onRetry && (
              <button
                onClick={handleRetry}
                disabled={retrying}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all bg-white/5 hover:bg-white/10 text-red-300 border border-red-500/20 hover:border-red-500/40"
                style={{ opacity: retrying ? 0.7 : 1 }}
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
