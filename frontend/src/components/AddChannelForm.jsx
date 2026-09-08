/**
 * AddChannelForm Component
 * =========================
 * Input form for adding YouTube channels to the user's watchlist.
 * Validates input and provides feedback on channel resolution.
 */

import { useState } from "react";

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

      // Clear success message after 3 seconds
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
    <div className="glass rounded-xl p-5">
      <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-3 flex items-center gap-2">
        <svg className="w-4 h-4 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Add Channel
      </h3>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <input
            id="add-channel-input"
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setStatus(null);
              setMessage("");
            }}
            placeholder="Paste channel URL or ID (UC...)"
            className="w-full px-4 py-2.5 bg-surface-800/80 border border-surface-600/40 rounded-lg text-sm text-surface-100 placeholder-surface-500 focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/50 transition-all duration-200 pr-10"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="w-4 h-4 text-surface-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/>
              <path fill="white" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </div>
        </div>

        <button
          id="add-channel-submit-btn"
          type="submit"
          disabled={loading || !input.trim()}
          className="w-full py-2.5 px-4 bg-gradient-to-r from-accent-600 to-accent-500 hover:from-accent-500 hover:to-accent-400 text-white text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Adding...
            </span>
          ) : (
            "Add to Watchlist"
          )}
        </button>
      </form>

      {/* Status messages */}
      {status && message && (
        <div
          className={`mt-3 px-3 py-2 rounded-lg text-xs animate-fade-in ${
            status === "success"
              ? "bg-success/10 border border-success/30 text-success"
              : "bg-error/10 border border-error/30 text-error"
          }`}
        >
          {message}
        </div>
      )}

      <p className="mt-3 text-xs text-surface-500">
        Supports <code className="text-surface-400">youtube.com/channel/UC...</code> URLs or raw channel IDs
      </p>
    </div>
  );
}
