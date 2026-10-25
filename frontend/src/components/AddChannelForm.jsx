import { useState } from "react";
import { Plus, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

const YoutubeIcon = ({ className, style }) => (
  <svg className={className} style={style} fill="currentColor" viewBox="0 0 24 24">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/>
    <path fill="var(--color-surface-900)" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

export default function AddChannelForm({ onAddChannel, loading }) {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState(null); // 'success' | 'error' | null
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    setStatus(null);
    setMessage("");

    try {
      await onAddChannel(input.trim());
      setStatus("success");
      setMessage("Channel added to your watchlist!");
      setInput("");

      setTimeout(() => {
        setStatus(null);
        setMessage("");
      }, 3000);
    } catch (err) {
      setStatus("error");
      setMessage(err?.message || "Failed to add channel");
    }
  };

  return (
    <div className="glass-card p-6 relative overflow-hidden">
      {/* Decorative gradient blob */}
      <div className="absolute -left-12 -top-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-[0_0_15px_rgba(255,255,255,0.2)]">
          <YoutubeIcon className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white tracking-wide">Add Channel</h3>
          <p className="text-xs text-gray-400 font-medium">Track a new YouTube creator</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
        <div>
          <label htmlFor="add-channel-input" className="block text-xs font-bold mb-2 text-gray-300 uppercase tracking-wider">
            Channel URL or Handle
          </label>
          <div className="relative group">
            <input
              id="add-channel-input"
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setStatus(null);
                setMessage("");
              }}
              placeholder="youtube.com/@handle or UC..."
              className="input-light w-full"
            />
          </div>
        </div>

        <button
          id="add-channel-submit-btn"
          type="submit"
          disabled={loading || !input.trim()}
          className="btn-primary w-full py-3 text-sm tracking-wide"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Resolving...
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add to Watchlist
            </span>
          )}
        </button>
      </form>

      {/* Status message */}
      {status && message && (
        <div
          className={`mt-4 px-4 py-3 rounded-xl text-xs font-bold animate-fade-in flex items-start gap-2.5 backdrop-blur-md border ${
            status === "success"
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}
        >
          {status === "success"
            ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          }
          <span className="leading-relaxed">{message}</span>
        </div>
      )}

      {/* Helper text */}
      <div className="mt-5 p-4 rounded-xl bg-white/5 border border-white/5 relative z-10">
        <p className="text-[11px] font-bold mb-2 text-gray-400 uppercase tracking-wider">Supported formats</p>
        <ul className="space-y-1.5 text-xs text-gray-300 font-mono">
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_5px_rgba(96,165,250,0.5)]" />
            youtube.com/@handle
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_5px_rgba(96,165,250,0.5)]" />
            youtube.com/customname
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_5px_rgba(96,165,250,0.5)]" />
            youtube.com/channel/UC...
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_5px_rgba(96,165,250,0.5)]" />
            UCxxxxxxxxxxxxxxxxxx
          </li>
        </ul>
      </div>
    </div>
  );
}
