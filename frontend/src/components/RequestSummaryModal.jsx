import { useState, useEffect, useMemo } from "react";
import {
  X,
  Sparkles,
  Check,
  Loader2,
  Search,
  Link2,
  Tv,
  AlertTriangle,
  CheckCircle2,
  Timer,
  ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";
import { useChannels } from "../hooks/useChannels";
import { useSummaries } from "../hooks/useSummaries";
import MarkdownSummary from "./MarkdownSummary";

function getVideoStatusChip(status) {
  switch (status) {
    case "completed":
      return {
        label: "Summarized",
        cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    case "processing":
      return {
        label: "Processing…",
        cls: "bg-amber-50 text-amber-800 border-amber-200",
      };
    case "pending":
      return {
        label: "Queued",
        cls: "bg-sky-50 text-sky-700 border-sky-200",
      };
    case "failed":
      return {
        label: "Failed",
        cls: "bg-red-50 text-red-700 border-red-200",
      };
    default:
      return {
        label: "Ready",
        cls: "bg-stone-100 text-stone-600 border-stone-200",
      };
  }
}

export default function RequestSummaryModal({ open, onClose }) {
  const { channels } = useChannels();
  const {
    summaries,
    fetchChannelVideos,
    inspectVideoForSummary,
    requestVideoSummaries,
  } = useSummaries();

  const [tab, setTab] = useState("channels"); // "channels" | "url"
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [channelVideos, setChannelVideos] = useState([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [videoSearch, setVideoSearch] = useState("");

  // URL mode state
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [inspectingUrl, setInspectingUrl] = useState(false);
  const [urlError, setUrlError] = useState("");
  const [customVideos, setCustomVideos] = useState([]);

  // Multi-select map: videoId -> video object
  const [selectedMap, setSelectedMap] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [requestedIds, setRequestedIds] = useState(null);
  const [requestNotice, setRequestNotice] = useState("");
  const [previewExpandedId, setPreviewExpandedId] = useState(null);

  // Initialize / validate selected channel when modal opens or channels change
  useEffect(() => {
    if (!open || channels.length === 0) return;
    const exists = channels.some(
      (ch) => (ch.channel_id ?? ch.data?.channel_id) === selectedChannelId,
    );
    if (!selectedChannelId || !exists) {
      const firstId = channels[0].channel_id ?? channels[0].data?.channel_id;
      if (firstId) setSelectedChannelId(firstId);
    }
  }, [open, channels, selectedChannelId]);

  // Reset transient view when closed
  useEffect(() => {
    if (!open) {
      setRequestedIds(null);
      setRequestNotice("");
      setPreviewExpandedId(null);
      setSelectedMap({});
      setLoadError("");
      setUrlError("");
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Load RSS videos (excluding YouTube Shorts) whenever selectedChannelId changes
  useEffect(() => {
    if (!open || tab !== "channels" || !selectedChannelId) return;
    let cancelled = false;
    setLoadingVideos(true);
    setLoadError("");
    fetchChannelVideos(selectedChannelId)
      .then((list) => {
        if (!cancelled) {
          setChannelVideos((list || []).filter((v) => !v.isShort));
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setChannelVideos([]);
          setLoadError(err?.message || "Could not load videos for this channel.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingVideos(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, tab, selectedChannelId, fetchChannelVideos]);

  const liveStatusByVid = useMemo(() => {
    const map = new Map();
    for (const s of summaries) {
      if (s?.video_id) map.set(s.video_id, s);
    }
    return map;
  }, [summaries]);

  const enrichedChannelVideos = useMemo(() => {
    return channelVideos
      .filter((v) => !v.isShort)
      .map((v) => {
        const live = liveStatusByVid.get(v.videoId);
        return live
          ? {
              ...v,
              docId: live.$id ?? live.id ?? v.docId,
              status: live.status || v.status,
              ai_summary: live.ai_summary || v.ai_summary || "",
              error_message: live.error_message || v.error_message || "",
            }
          : v;
      });
  }, [channelVideos, liveStatusByVid]);

  const enrichedCustomVideos = useMemo(() => {
    return customVideos
      .filter((v) => !v.isShort)
      .map((v) => {
        const live = liveStatusByVid.get(v.videoId);
        return live
          ? {
              ...v,
              docId: live.$id ?? live.id ?? v.docId,
              status: live.status || v.status,
              ai_summary: live.ai_summary || v.ai_summary || "",
              error_message: live.error_message || v.error_message || "",
            }
          : v;
      });
  }, [customVideos, liveStatusByVid]);

  const filteredChannelVideos = useMemo(() => {
    const q = videoSearch.trim().toLowerCase();
    if (!q) return enrichedChannelVideos;
    return enrichedChannelVideos.filter((v) =>
      (v.title || "").toLowerCase().includes(q),
    );
  }, [enrichedChannelVideos, videoSearch]);

  const selectedList = useMemo(() => Object.values(selectedMap), [selectedMap]);

  const liveRequestedRows = useMemo(() => {
    if (!requestedIds) return [];
    const byVid = new Map(summaries.map((s) => [s.video_id, s]));
    return requestedIds.map((vid) => {
      const live = byVid.get(vid);
      const fallback = selectedMap[vid] || {};
      return {
        videoId: vid,
        title: live?.title || fallback.title || `Video ${vid}`,
        thumbnailUrl:
          live?.thumbnail_url ||
          fallback.thumbnailUrl ||
          `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
        status: live?.status || "pending",
        ai_summary: live?.ai_summary || "",
        error_message: live?.error_message || "",
      };
    });
  }, [requestedIds, summaries, selectedMap]);

  if (!open) return null;

  const toggleVideo = (video) => {
    setSelectedMap((prev) => {
      const next = { ...prev };
      if (next[video.videoId]) {
        delete next[video.videoId];
      } else {
        next[video.videoId] = video;
      }
      return next;
    });
  };

  const selectUnsummarized = () => {
    setSelectedMap((prev) => {
      const next = { ...prev };
      for (const v of filteredChannelVideos) {
        if (!v.isShort && v.status !== "completed") {
          next[v.videoId] = v;
        }
      }
      return next;
    });
  };

  const handleInspectUrl = async (e) => {
    e.preventDefault();
    if (!videoUrlInput.trim() || inspectingUrl) return;
    setInspectingUrl(true);
    setUrlError("");
    try {
      const video = await inspectVideoForSummary(videoUrlInput.trim());
      if (video.isShort) {
        setUrlError(
          "YouTube Shorts are excluded from TubeDigest. Please paste a full-length video or livestream URL.",
        );
        return;
      }
      setCustomVideos((prev) => {
        const filtered = prev.filter((item) => item.videoId !== video.videoId);
        return [video, ...filtered];
      });
      setSelectedMap((prev) => ({ ...prev, [video.videoId]: video }));
      setVideoUrlInput("");
      toast.success(`Selected "${video.title}"`);
    } catch (err) {
      setUrlError(err?.message || "Failed to inspect YouTube video.");
    } finally {
      setInspectingUrl(false);
    }
  };

  const handleGenerate = async () => {
    if (selectedList.length === 0 || submitting) return;
    setSubmitting(true);
    setRequestNotice("");
    try {
      const res = await requestVideoSummaries(selectedList);
      setRequestedIds(res.videoIds || selectedList.map((v) => v.videoId));
      if (res.mode === "instant") {
        const results = res.results || [];
        const okCount = results.filter((r) => r.status === "completed").length;
        const failedCount = results.filter((r) => r.status === "failed").length;
        if (failedCount > 0 && okCount === 0) {
          toast.error(results[0]?.error || "Summary generation failed.");
        } else if (failedCount > 0) {
          toast.success(
            `Generated ${okCount} summary(ies); ${failedCount} failed.`,
          );
        } else {
          toast.success("Summaries generated!");
        }
      } else if (res.mode === "worker") {
        toast.success("Generating summaries now — watching live progress!");
      } else if (res.message) {
        setRequestNotice(res.message);
        toast.success("Videos queued for summary generation!");
      }
    } catch (err) {
      toast.error(err?.message || "Could not request summaries.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/35 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Select Videos & Request Summary"
        className="w-full max-w-3xl max-h-[88vh] flex flex-col glass-strong rounded-2xl border border-[#e6e3dc] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e6e3dc] shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-50 border border-red-100 text-red-600">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-900">
                {requestedIds
                  ? "Generating Requested Summaries"
                  : "Select Videos & Request Summary"}
              </h2>
              <p className="text-xs text-stone-500">
                {requestedIds
                  ? "Live progress updates automatically when summarization finishes"
                  : "Pick full-length videos from your channels (Shorts filtered out) or paste a URL"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-stone-400 hover:text-stone-900 hover:bg-stone-100 cursor-pointer transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        {requestedIds ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-4 sidebar-scroll bg-white">
            {requestNotice && (
              <div className="px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800 leading-relaxed">
                {requestNotice}
              </div>
            )}

            {liveRequestedRows.map((row) => {
              const isDone = row.status === "completed";
              const isFailed = row.status === "failed";
              const isActive =
                row.status === "pending" || row.status === "processing";
              const isPreviewOpen = previewExpandedId === row.videoId;

              return (
                <div
                  key={row.videoId}
                  className="rounded-xl p-4 bg-[#fafaf8] border border-[#e6e3dc] space-y-3"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={row.thumbnailUrl}
                      alt={row.title}
                      referrerPolicy="no-referrer"
                      className="w-24 aspect-video rounded-lg object-cover shrink-0 border border-stone-200"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-stone-900 line-clamp-2">
                        {row.title}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        {isDone && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Summary ready!
                          </span>
                        )}
                        {isActive && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            {row.status === "processing"
                              ? "Generating summary with AI…"
                              : "Queued — starting AI generation…"}
                          </span>
                        )}
                        {isFailed && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {row.error_message || "Failed to generate summary"}
                          </span>
                        )}
                      </div>
                    </div>

                    {isDone && (
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewExpandedId(
                            isPreviewOpen ? null : row.videoId,
                          )
                        }
                        className="btn-secondary text-xs py-1.5 px-3 shrink-0"
                      >
                        {isPreviewOpen ? "Hide" : "View Summary"}
                      </button>
                    )}
                  </div>

                  {isDone && isPreviewOpen && row.ai_summary && (
                    <div className="pt-3 border-t border-stone-200/80">
                      <MarkdownSummary content={row.ai_summary} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <>
            {/* Mode Tabs */}
            <div className="px-6 pt-4 pb-3 border-b border-[#e6e3dc] flex flex-wrap items-center justify-between gap-3 shrink-0 bg-white">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTab("channels")}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
                    tab === "channels"
                      ? "bg-stone-900 text-white border-stone-900"
                      : "bg-[#f7f6f2] text-stone-600 border-[#e5e2d9] hover:text-stone-900"
                  }`}
                >
                  <Tv className="w-3.5 h-3.5" />
                  From Your Channels
                </button>
                <button
                  type="button"
                  onClick={() => setTab("url")}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
                    tab === "url"
                      ? "bg-stone-900 text-white border-stone-900"
                      : "bg-[#f7f6f2] text-stone-600 border-[#e5e2d9] hover:text-stone-900"
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Paste Video URL
                </button>
              </div>

              {selectedList.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedMap({})}
                  className="text-xs font-semibold text-stone-500 hover:text-stone-900 cursor-pointer"
                >
                  Clear selection ({selectedList.length})
                </button>
              )}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 sidebar-scroll bg-white">
              {tab === "channels" ? (
                <>
                  {channels.length === 0 ? (
                    <div className="text-center py-12 text-stone-500 text-sm">
                      No tracked channels yet. Use the{" "}
                      <span className="text-stone-900 font-semibold">
                        Paste Video URL
                      </span>{" "}
                      tab above or add a channel first!
                    </div>
                  ) : (
                    <>
                      {/* Channel selector pills */}
                      <div className="flex gap-2 overflow-x-auto pb-1 sidebar-scroll">
                        {channels.map((ch) => {
                          const cid = ch.channel_id ?? ch.data?.channel_id;
                          const cname =
                            ch.name && ch.name !== cid
                              ? ch.name
                              : `Channel ${cid?.slice(0, 8)}…`;
                          const active = selectedChannelId === cid;
                          return (
                            <button
                              key={cid}
                              type="button"
                              onClick={() => setSelectedChannelId(cid)}
                              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border cursor-pointer transition-colors shrink-0 ${
                                active
                                  ? "bg-stone-900 text-white border-stone-900"
                                  : "bg-[#f4f2ec] text-stone-700 border-[#e5e2d9] hover:bg-stone-200/70"
                              }`}
                            >
                              {ch.thumbnail_url && (
                                <img
                                  src={ch.thumbnail_url}
                                  alt={cname}
                                  referrerPolicy="no-referrer"
                                  className="w-4 h-4 rounded-full object-cover"
                                />
                              )}
                              <span>{cname}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Search & quick select bar */}
                      <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between">
                        <div className="relative flex-1 group">
                          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-stone-800" />
                          <input
                            type="text"
                            value={videoSearch}
                            onChange={(e) => setVideoSearch(e.target.value)}
                            placeholder="Filter channel uploads by title…"
                            className="input-light pl-10 py-2 text-xs"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={selectUnsummarized}
                          disabled={loadingVideos || filteredChannelVideos.length === 0}
                          className="btn-secondary text-xs py-2 px-3 shrink-0"
                        >
                          Select Unsummarized
                        </button>
                      </div>

                      {loadingVideos ? (
                        <div className="space-y-2.5">
                          {[1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-200/60"
                            >
                              <div className="skeleton w-24 h-14 rounded-lg shrink-0" />
                              <div className="flex-1 space-y-2">
                                <div className="skeleton h-3.5 w-3/4 rounded" />
                                <div className="skeleton h-2.5 w-1/3 rounded" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : loadError ? (
                        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                          {loadError}
                        </div>
                      ) : filteredChannelVideos.length === 0 ? (
                        <p className="text-center py-8 text-sm text-stone-500">
                          No full-length videos found in this channel&apos;s
                          recent feed (YouTube Shorts are hidden).
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {filteredChannelVideos.map((video) => {
                            const checked = !!selectedMap[video.videoId];
                            const chip = getVideoStatusChip(video.status);
                            return (
                              <div
                                key={video.videoId}
                                role="checkbox"
                                tabIndex={0}
                                aria-checked={checked}
                                data-video-id={video.videoId}
                                onClick={() => toggleVideo(video)}
                                onKeyDown={(e) => {
                                  if (e.key === " " || e.key === "Enter") {
                                    e.preventDefault();
                                    toggleVideo(video);
                                  }
                                }}
                                className={`w-full text-left flex items-center gap-3.5 p-3 rounded-xl border transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 ${
                                  checked
                                    ? "bg-blue-50/70 border-blue-300"
                                    : "bg-[#fafaf8] border-[#e6e3dc] hover:bg-stone-50 hover:border-stone-300"
                                }`}
                              >
                                <span
                                  className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-colors ${
                                    checked
                                      ? "bg-stone-900 border-stone-900 text-white"
                                      : "bg-white border-stone-300"
                                  }`}
                                >
                                  {checked && <Check className="w-3.5 h-3.5" />}
                                </span>

                                <img
                                  src={video.thumbnailUrl}
                                  alt={video.title}
                                  referrerPolicy="no-referrer"
                                  className="w-24 aspect-video rounded-lg object-cover shrink-0 border border-stone-200"
                                  loading="lazy"
                                />

                                <div className="flex-1 min-w-0">
                                  <p className="text-xs sm:text-sm font-semibold text-stone-900 line-clamp-2">
                                    {video.title}
                                  </p>
                                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-stone-500">
                                    <span>
                                      {new Date(
                                        video.publishedAt,
                                      ).toLocaleDateString()}
                                    </span>
                                    <span
                                      className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${chip.cls}`}
                                    >
                                      {chip.label}
                                    </span>
                                  </div>
                                </div>

                                <a
                                  href={`https://www.youtube.com/watch?v=${video.videoId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1.5 rounded-lg text-stone-400 hover:text-stone-800 shrink-0"
                                  title="Open on YouTube"
                                  aria-label={`Open ${video.title} on YouTube`}
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <form onSubmit={handleInspectUrl} className="flex gap-2.5">
                    <input
                      id="request-video-url-input"
                      type="text"
                      value={videoUrlInput}
                      onChange={(e) => {
                        setVideoUrlInput(e.target.value);
                        setUrlError("");
                      }}
                      placeholder="https://www.youtube.com/watch?v=... or youtu.be/..."
                      className="input-light flex-1"
                    />
                    <button
                      id="inspect-video-url-btn"
                      type="submit"
                      disabled={inspectingUrl || !videoUrlInput.trim()}
                      className="btn-secondary shrink-0"
                    >
                      {inspectingUrl ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Inspecting…
                        </>
                      ) : (
                        "Add Video"
                      )}
                    </button>
                  </form>

                  {urlError && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                      {urlError}
                    </div>
                  )}

                  {enrichedCustomVideos.length === 0 ? (
                    <div className="text-center py-10 text-xs text-stone-500 bg-[#f7f6f2] rounded-xl border border-[#e6e3dc]">
                      Paste any full-length YouTube video or livestream link
                      above to inspect and request an instant summary (Shorts
                      are excluded).
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {enrichedCustomVideos.map((video) => {
                        const checked = !!selectedMap[video.videoId];
                        const chip = getVideoStatusChip(video.status);
                        return (
                          <div
                            key={video.videoId}
                            role="checkbox"
                            tabIndex={0}
                            aria-checked={checked}
                            data-video-id={video.videoId}
                            onClick={() => toggleVideo(video)}
                            onKeyDown={(e) => {
                              if (e.key === " " || e.key === "Enter") {
                                e.preventDefault();
                                toggleVideo(video);
                              }
                            }}
                            className={`w-full text-left flex items-center gap-3.5 p-3 rounded-xl border transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 ${
                              checked
                                ? "bg-blue-50/70 border-blue-300"
                                : "bg-[#fafaf8] border-[#e6e3dc] hover:bg-stone-50"
                            }`}
                          >
                            <span
                              className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${
                                checked
                                  ? "bg-stone-900 border-stone-900 text-white"
                                  : "bg-white border-stone-300"
                              }`}
                            >
                              {checked && <Check className="w-3.5 h-3.5" />}
                            </span>
                            <img
                              src={video.thumbnailUrl}
                              alt={video.title}
                              referrerPolicy="no-referrer"
                              className="w-24 aspect-video rounded-lg object-cover shrink-0 border border-stone-200"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-stone-900 line-clamp-2">
                                {video.title}
                              </p>
                              <div className="mt-1 flex items-center gap-2 text-xs text-stone-500">
                                <span>{video.channelName}</span>
                                <span
                                  className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${chip.cls}`}
                                >
                                  {chip.label}
                                </span>
                              </div>
                            </div>
                            <a
                              href={`https://www.youtube.com/watch?v=${video.videoId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-800 shrink-0"
                              title="Open on YouTube"
                              aria-label={`Open ${video.title} on YouTube`}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#e6e3dc] flex items-center justify-between gap-3 bg-[#f7f6f2] shrink-0">
          {requestedIds ? (
            <>
              <div className="flex items-center gap-2 text-xs text-stone-600 font-medium">
                <Timer className="w-4 h-4 text-stone-500" />
                <span>
                  {liveRequestedRows.filter((r) => r.status === "completed").length}{" "}
                  of {liveRequestedRows.length} completed
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setRequestedIds(null);
                    setSelectedMap({});
                  }}
                  className="btn-secondary text-xs py-2 px-3.5"
                >
                  Select More
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-primary text-xs py-2 px-4"
                >
                  Done
                </button>
              </div>
            </>
          ) : (
            <>
              <span className="text-xs font-medium text-stone-500">
                {selectedList.length === 0
                  ? "Select 1 or more videos above"
                  : `${selectedList.length} video(s) selected`}
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary text-xs py-2 px-3.5"
                >
                  Cancel
                </button>
                <button
                  id="submit-request-summary-btn"
                  type="button"
                  disabled={selectedList.length === 0 || submitting}
                  onClick={handleGenerate}
                  className="btn-primary text-xs sm:text-sm py-2 px-4"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Requesting…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Request Summary
                      {selectedList.length > 0 ? ` (${selectedList.length})` : ""}
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
