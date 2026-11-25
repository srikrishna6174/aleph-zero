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
    <path fill="#18181b" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
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
    <div className="glass-card p-6 relative overflow-hidden">
      <div className="absolute -left-12 -top-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-3 mb-5 relative z-10">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-[0_0_15px_rgba(255,255,255,0.2)]">
          <YoutubeIcon className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white tracking-wide">
            Add Channel
          </h3>
          <p className="text-xs text-zinc-400 font-medium">
            Track a new YouTube creator
          </p>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="mb-5 relative z-10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            Popular Channels
          </span>
          <span className="text-[10px] text-zinc-500">1-click fill</span>
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
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all duration-150 border ${
                  isTracked
                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25 cursor-default opacity-80"
                    : "cursor-pointer bg-white/[0.05] hover:bg-blue-500/20 text-zinc-300 hover:text-blue-200 border-white/[0.07] hover:border-blue-500/35"
                }`}
              >
                {isTracked && <Check className="w-3 h-3 text-emerald-400" />}
                {preset.name}
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
        <div>
          <label
            htmlFor="add-channel-input"
            className="block text-xs font-bold mb-2 text-zinc-300 uppercase tracking-wider"
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
                className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5"
              >
                <Tag className="w-3.5 h-3.5 text-blue-400" />
                Display Name (Optional)
              </label>
              <button
                type="button"
                onClick={() => {
                  setShowCustomName(false);
                  setCustomName("");
                }}
                className="text-[11px] text-zinc-500 hover:text-zinc-300 cursor-pointer"
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
            className="text-[11px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer transition-colors"
          >
            + Add custom display name
          </button>
        )}

        <button
          id="add-channel-submit-btn"
          type="submit"
          disabled={submitting || !input.trim()}
          className="btn-primary w-full py-3 text-sm tracking-wide"
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
          className={`mt-4 px-4 py-3 rounded-xl text-xs font-semibold animate-fade-in flex items-start gap-2.5 border ${
            status === "success"
              ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
              : "bg-red-500/10 border-red-500/25 text-red-300"
          }`}
        >
          {status === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
          )}
          <span className="leading-relaxed">{message}</span>
        </div>
      )}

      {/* Supported formats */}
      <div className="mt-5 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] relative z-10">
        <p className="text-[11px] font-bold mb-2 text-zinc-400 uppercase tracking-wider">
          Supported formats
        </p>
        <ul className="space-y-1.5 text-xs text-zinc-300 font-mono">
          {[
            "youtube.com/@handle or @handle",
            "youtube.com/watch?v=... or youtu.be/...",
            "youtube.com/channel/UC...",
            "UCxxxxxxxxxxxxxxxxxxxxxx (24-char ID)",
          ].map((fmt) => (
            <li key={fmt} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_5px_rgba(96,165,250,0.5)] shrink-0" />
              <span className="truncate">{fmt}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
