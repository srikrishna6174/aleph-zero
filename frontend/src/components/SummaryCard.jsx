import { useState } from "react";
import {
  ExternalLink,
  Clock,
  User,
  Zap,
  RotateCcw,
  AlertTriangle,
  Loader2,
  Timer,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import toast from "react-hot-toast";
import MarkdownSummary from "./MarkdownSummary";

function formatRelativeTime(isoString) {
  if (!isoString) return "Recently";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "Recently";

  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getStatusBadge(status) {
  switch (status) {
    case "completed":
      return {
        label: "Summarized",
        bg: "rgba(16, 185, 129, 0.15)",
        color: "#34d399",
        border: "rgba(16, 185, 129, 0.3)",
        dot: "#10b981",
        stripe: "linear-gradient(90deg, #10b981, #34d399)",
      };
    case "processing":
      return {
        label: "Processing",
        bg: "rgba(245, 158, 11, 0.15)",
        color: "#fbbf24",
        border: "rgba(245, 158, 11, 0.3)",
        dot: "#f59e0b",
        stripe: "linear-gradient(90deg, #f59e0b, #fbbf24)",
      };
    case "pending":
      return {
        label: "Queued",
        bg: "rgba(59, 130, 246, 0.15)",
        color: "#60a5fa",
        border: "rgba(59, 130, 246, 0.3)",
        dot: "#3b82f6",
        stripe: "linear-gradient(90deg, #3b82f6, #60a5fa)",
      };
    case "failed":
      return {
        label: "Failed",
        bg: "rgba(239, 68, 68, 0.15)",
        color: "#f87171",
        border: "rgba(239, 68, 68, 0.3)",
        dot: "#ef4444",
        stripe: "linear-gradient(90deg, #ef4444, #f87171)",
      };
    default:
      return {
        label: status || "Pending",
        bg: "rgba(255, 255, 255, 0.05)",
        color: "var(--color-surface-400)",
        border: "rgba(255, 255, 255, 0.1)",
        dot: "var(--color-surface-500)",
        stripe: "rgba(255, 255, 255, 0.1)",
      };
  }
}

export default function SummaryCard({
  video,
  channelName,
  channelAvatar,
  index = 0,
  onRetry,
  selectable = false,
  selected = false,
  onToggleSelect,
}) {
  const [expanded, setExpanded] = useState(false);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);

  if (!video) return null;

  const badge = getStatusBadge(video.status);
  const videoId = video.video_id || "";
  const title = video.title || "Untitled Video";
  const thumbnailUrl =
    video.thumbnail_url ||
    (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "");
  const videoUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : "#";
  const isLongSummary = (video.ai_summary || "").length > 420;
  const isMetadataOnly = (video.ai_summary || "")
    .toLowerCase()
    .includes("(no transcript available)");

  const exactDate = video.published_at
    ? new Date(video.published_at).toLocaleString()
    : "";

  const handleRetry = async () => {
    if (retrying || !onRetry) return;
    setRetrying(true);
    try {
      const ok = await onRetry(video.$id ?? video.id);
      if (ok) {
        toast.success("Re-queued for AI processing!");
      } else {
        toast.error("Failed to re-queue. Please try again.");
      }
    } finally {
      setRetrying(false);
    }
  };

  const handleCopySummary = async () => {
    if (!video.ai_summary) return;
    try {
      await navigator.clipboard.writeText(video.ai_summary);
      setCopied(true);
      toast.success("Summary copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <article
      className={`animate-fade-in-up rounded-2xl overflow-hidden glass-card group ${
        selectable && selected ? "ring-2 ring-blue-500/70 border-blue-500/50" : ""
      }`}
      style={{ animationDelay: `${(index % 10) * 0.04}s` }}
    >
      {/* Top status stripe */}
      <div className="h-[3px] w-full" style={{ background: badge.stripe }} />

      {/* Video header row */}
      <div className="flex flex-col sm:flex-row gap-5 p-5 sm:p-6">
        {selectable && onToggleSelect && (
          <div className="flex items-start pt-1">
            <button
              type="button"
              onClick={() => onToggleSelect(video)}
              aria-label={`Select ${title}`}
              className={`w-5 h-5 rounded-md flex items-center justify-center border cursor-pointer transition-colors ${
                selected
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-black/40 border-white/25 hover:border-blue-400"
              }`}
            >
              {selected && <Check className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
        {videoId && (
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 block"
            aria-label={`Watch ${title} on YouTube`}
          >
            <div className="relative rounded-xl overflow-hidden shadow-[0_6px_16px_rgba(0,0,0,0.4)] bg-zinc-900 w-full sm:w-[176px] aspect-video border border-white/5">
              {!imgError && thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt={title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-500">
                  <svg
                    className="w-8 h-8 text-red-500/80"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
                    <path
                      fill="#18181b"
                      d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z"
                    />
                  </svg>
                </div>
              )}

              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/45 backdrop-blur-[2px]">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.6)] scale-90 group-hover:scale-100 transition-transform duration-300">
                  <svg
                    className="w-4 h-4 text-white ml-0.5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </div>
          </a>
        )}

        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-base sm:text-[17px] leading-snug line-clamp-2 text-zinc-100 transition-colors hover:text-blue-400"
            >
              {title}
            </a>

            <span
              className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 uppercase tracking-wider"
              style={{
                background: badge.bg,
                color: badge.color,
                border: `1px solid ${badge.border}`,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: badge.dot }}
              />
              {badge.label}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-zinc-400">
            {channelName && (
              <span className="inline-flex items-center gap-1.5 bg-white/[0.05] border border-white/[0.07] px-2.5 py-1 rounded-lg">
                {channelAvatar ? (
                  <img
                    src={channelAvatar}
                    alt={channelName}
                    referrerPolicy="no-referrer"
                    className="w-4 h-4 rounded-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <User className="w-3.5 h-3.5 text-zinc-400" />
                )}
                <span className="text-zinc-200 font-semibold">
                  {channelName}
                </span>
              </span>
            )}
            <span
              className="inline-flex items-center gap-1.5"
              title={exactDate}
            >
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              {formatRelativeTime(video.published_at)}
            </span>
            {isMetadataOnly && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/10 text-zinc-400">
                Metadata-based
              </span>
            )}
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 transition-colors text-zinc-400 hover:text-blue-400 ml-auto sm:ml-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Watch on YouTube
            </a>
          </div>
        </div>
      </div>

      {/* ── AI Summary (completed) ── */}
      {video.status === "completed" && video.ai_summary && (
        <div className="px-5 sm:px-6 pb-5 sm:pb-6">
          <div className="rounded-xl p-4 sm:p-5 bg-black/25 border border-white/[0.06] relative overflow-hidden">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 shadow-[0_0_12px_rgba(59,130,246,0.35)]">
                  <Zap className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-blue-300">
                  AI Summary
                </span>
              </div>

              <button
                type="button"
                onClick={handleCopySummary}
                className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer bg-white/[0.05] hover:bg-white/10 text-zinc-300 hover:text-white border border-white/[0.08]"
                title="Copy summary to clipboard"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>

            <div className="relative">
              <div
                className={`transition-all duration-300 ${
                  !expanded && isLongSummary
                    ? "max-h-56 overflow-hidden"
                    : "max-h-none"
                }`}
              >
                <MarkdownSummary content={video.ai_summary} />
              </div>

              {!expanded && isLongSummary && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#101014] via-[#101014]/75 to-transparent" />
              )}
            </div>

            {isLongSummary && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-3.5 inline-flex items-center gap-1.5 text-xs font-bold cursor-pointer transition-colors text-blue-400 hover:text-blue-300 uppercase tracking-wider"
              >
                {expanded ? (
                  <>
                    Show less
                    <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    Read full summary
                    <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Processing state ── */}
      {video.status === "processing" && (
        <div className="px-5 sm:px-6 pb-5">
          <div className="rounded-xl px-4 py-3 flex items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin shrink-0 text-amber-400" />
              <span className="text-sm font-semibold text-amber-200">
                AI is generating the summary…
              </span>
            </div>
            {onRetry && (
              <button
                type="button"
                onClick={handleRetry}
                disabled={retrying}
                className="text-xs font-semibold text-amber-300/80 hover:text-amber-200 underline underline-offset-2 cursor-pointer"
                title="Re-queue if stuck"
              >
                Re-queue
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Pending state ── */}
      {video.status === "pending" && (
        <div className="px-5 sm:px-6 pb-5">
          <div className="rounded-xl px-4 py-3 flex items-center gap-3 bg-blue-500/10 border border-blue-500/20">
            <Timer className="w-4 h-4 shrink-0 text-blue-400" />
            <span className="text-sm font-semibold text-blue-200">
              Queued for processing — waiting for worker run
            </span>
          </div>
        </div>
      )}

      {/* ── Failed state ── */}
      {video.status === "failed" && (
        <div className="px-5 sm:px-6 pb-5">
          <div className="rounded-xl px-4 py-3 bg-red-500/10 border border-red-500/20">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span
                  className={`text-sm font-semibold text-red-200 ${
                    showErrorDetails ? "whitespace-pre-wrap break-words" : "truncate"
                  }`}
                >
                  {video.error_message || "Failed to generate summary"}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {video.error_message && video.error_message.length > 60 && (
                  <button
                    type="button"
                    onClick={() => setShowErrorDetails((v) => !v)}
                    className="text-xs font-semibold text-red-300/80 hover:text-red-200 cursor-pointer px-2 py-1 rounded hover:bg-white/5"
                  >
                    {showErrorDetails ? "Hide" : "Details"}
                  </button>
                )}
                {onRetry && (
                  <button
                    type="button"
                    onClick={handleRetry}
                    disabled={retrying}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all bg-white/[0.06] hover:bg-white/12 text-red-200 border border-red-500/25 hover:border-red-400/50 disabled:opacity-60"
                  >
                    <RotateCcw
                      className={`w-3.5 h-3.5 ${retrying ? "animate-spin" : ""}`}
                    />
                    {retrying ? "Retrying…" : "Retry"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
