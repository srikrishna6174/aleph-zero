import { useState, useMemo } from "react";
import {
  Plus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Tag,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";
import { POPULAR_CHANNELS } from "../constants/popularChannels";

const YoutubeIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
    <path fill="#ffffff" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

export default function AddChannelForm({
  onAddChannel,
  subscribedChannelIds = [],
}) {
  const [input, setInput] = useState("");
  const [customName, setCustomName] = useState("");
  const [showCustomName, setShowCustomName] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState("");

  const subscribedSet = useMemo(
    () => new Set(subscribedChannelIds),
    [subscribedChannelIds],
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || submitting) return;

    setStatus(null);
    setMessage("");
    setSubmitting(true);

    try {
      const added = await onAddChannel(input.trim(), customName.trim());
      const addedName = added?.name || customName.trim() || "Channel";
      setStatus("success");
      setMessage(`${addedName} added to your watchlist!`);
      toast.success(`Subscribed to ${addedName}`);
      setInput("");
      setCustomName("");
      setShowCustomName(false);

      setTimeout(() => {
        setStatus(null);
        setMessage("");
      }, 4000);
    } catch (err) {
      const msg = err?.message || "Failed to add channel";
      setStatus("error");
      setMessage(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const selectPreset = (preset) => {
    if (subscribedSet.has(preset.channelId)) return;
    setInput(preset.handle);
    setCustomName(preset.name);
    setShowCustomName(true);
    setStatus(null);
    setMessage("");
  };

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-50 border border-red-100">
          <YoutubeIcon className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h3 className="text-base font-bold text-stone-900">
            Add Channel
          </h3>
          <p className="text-xs text-stone-500 font-medium">
            Track a new YouTube creator
          </p>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            Popular Channels
          </span>
          <span className="text-[11px] text-stone-400">1-click fill</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {POPULAR_CHANNELS.map((preset) => {
            const isTracked = subscribedSet.has(preset.channelId);
            return (
              <button
                key={preset.channelId}
                type="button"
                disabled={isTracked || submitting}
                onClick={() => selectPreset(preset)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors border ${
                  isTracked
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 cursor-default"
                    : "cursor-pointer bg-stone-100 hover:bg-stone-200/70 text-stone-700 hover:text-stone-900 border-stone-200"
                }`}
              >
                {isTracked && <Check className="w-3 h-3 text-emerald-600" />}
                {preset.name}
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="add-channel-input"
            className="block text-xs font-semibold mb-1.5 text-stone-700"
          >
            Channel URL, @Handle, Video, or ID
          </label>
          <input
            id="add-channel-input"
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setStatus(null);
              setMessage("");
            }}
            placeholder="@handle, youtube.com/@name, video URL, or UC..."
            className="input-light w-full"
          />
        </div>

        {/* Optional Custom Channel Name */}
        {showCustomName ? (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="custom-channel-name-input"
                className="text-xs font-semibold text-stone-700 flex items-center gap-1.5"
              >
                <Tag className="w-3.5 h-3.5 text-blue-600" />
                Display Name (Optional)
              </label>
              <button
                type="button"
                onClick={() => {
                  setShowCustomName(false);
                  setCustomName("");
                }}
                className="text-[11px] text-stone-500 hover:text-stone-800 cursor-pointer"
              >
                Hide
              </button>
            </div>
            <input
              id="custom-channel-name-input"
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Auto-detected if left blank"
              className="input-light w-full text-xs py-2"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowCustomName(true)}
            className="text-xs font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition-colors"
          >
            + Add custom display name
          </button>
        )}

        <button
          id="add-channel-submit-btn"
          type="submit"
          disabled={submitting || !input.trim()}
          className="btn-primary w-full py-2.5 text-sm"
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Resolving &amp; Adding…
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add to Watchlist
            </span>
          )}
        </button>
      </form>

      {status && message && (
        <div
          className={`mt-4 px-4 py-3 rounded-xl text-xs font-medium animate-fade-in flex items-start gap-2.5 border ${
            status === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {status === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          )}
          <span className="leading-relaxed">{message}</span>
        </div>
      )}

      {/* Supported formats */}
      <div className="mt-5 p-4 rounded-xl bg-[#f7f6f2] border border-[#e6e3dc]">
        <p className="text-[11px] font-semibold mb-2 text-stone-500 uppercase tracking-wider">
          Supported formats
        </p>
        <ul className="space-y-1.5 text-xs text-stone-700 font-mono">
          {[
            "youtube.com/@handle or @handle",
            "youtube.com/watch?v=... or youtu.be/...",
            "youtube.com/channel/UC...",
            "UCxxxxxxxxxxxxxxxxxxxxxx (24-char ID)",
          ].map((fmt) => (
            <li key={fmt} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-stone-400 shrink-0" />
              <span className="truncate">{fmt}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
