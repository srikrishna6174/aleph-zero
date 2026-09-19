/**
 * AddChannelForm Component
 * =========================
 * Clean, light-theme form for adding YouTube channels.
 */

import { useState } from "react";
import { Plus, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

// YouTube icon (not available in this lucide-react version)
const YoutubeIcon = ({ className, style }) => (
  <svg className={className} style={style} fill="currentColor" viewBox="0 0 24 24">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/>
    <path fill="white" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
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
    <div
      className="rounded-2xl p-6"
      style={{
        background: '#ffffff',
        border: '1px solid var(--color-surface-200)',
        boxShadow: '0 1px 4px rgba(15,23,42,0.06)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-5">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #ff0000, #cc0000)', boxShadow: '0 2px 8px rgba(255,0,0,0.25)' }}
        >
          <YoutubeIcon className="w-4 h-4" style={{ color: 'white' }} />
        </div>
        <div>
          <h3 className="text-sm font-bold" style={{ color: 'var(--color-surface-800)' }}>Add Channel</h3>
          <p className="text-xs" style={{ color: 'var(--color-surface-400)' }}>Track a YouTube channel</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="add-channel-input" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-surface-600)' }}>
            Channel URL or ID
          </label>
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
              placeholder="youtube.com/channel/UC... or UCxxxxx"
              className="input-light"
              style={{ paddingRight: '2.5rem' }}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <svg className="w-4 h-4" style={{ color: 'var(--color-surface-300)' }} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/>
                <path fill="white" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </div>
          </div>
        </div>

        <button
          id="add-channel-submit-btn"
          type="submit"
          disabled={loading || !input.trim()}
          className="btn-primary w-full py-2.5"
          style={{ borderRadius: '10px' }}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Adding...
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
          className="mt-3 px-3.5 py-2.5 rounded-xl text-xs font-medium animate-fade-in flex items-center gap-2"
          style={status === "success"
            ? { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d' }
            : { background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c' }
          }
        >
          {status === "success"
            ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            : <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          }
          {message}
        </div>
      )}

      {/* Helper text */}
      <div className="mt-4 p-3 rounded-xl" style={{ background: 'var(--color-surface-50)', border: '1px solid var(--color-surface-100)' }}>
        <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--color-surface-500)' }}>Supported formats:</p>
        <ul className="space-y-1 text-xs" style={{ color: 'var(--color-surface-400)' }}>
          <li className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full shrink-0" style={{ background: 'var(--color-accent-400)' }} />
            <code style={{ color: 'var(--color-surface-600)', fontFamily: 'monospace' }}>youtube.com/channel/UC...</code>
          </li>
          <li className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full shrink-0" style={{ background: 'var(--color-accent-400)' }} />
            <code style={{ color: 'var(--color-surface-600)', fontFamily: 'monospace' }}>UCxxxxxxxxxxxxxxxxxx</code>
          </li>
        </ul>
      </div>
    </div>
  );
}
