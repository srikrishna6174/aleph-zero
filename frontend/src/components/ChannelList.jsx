/**
 * ChannelList Component
 * ======================
 * Clean, light-theme list of subscribed YouTube channels.
 */

import { useState, useMemo } from "react";
import { Search, Trash2 } from "lucide-react";

// YouTube icon (not available in this lucide-react version)
const YoutubeIcon = ({ className, style }) => (
  <svg className={className} style={style} fill="currentColor" viewBox="0 0 24 24">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/>
    <path fill="white" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const Tv2Icon = ({ className, style }) => (
  <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a2 2 0 00-2 2v9a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 3l-4 4-4-4" />
  </svg>
);

export default function ChannelList({ channels, onRemoveChannel, loading }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [removingId, setRemovingId] = useState(null);

  const filteredChannels = useMemo(() => {
    if (!searchQuery) return channels;
    const q = searchQuery.toLowerCase();
    return channels.filter(c =>
      c.name?.toLowerCase().includes(q) || c.channel_id.toLowerCase().includes(q)
    );
  }, [channels, searchQuery]);

  const handleRemove = async (channelId) => {
    setRemovingId(channelId);
    try {
      await onRemoveChannel(channelId);
    } finally {
      setRemovingId(null);
    }
  };

  // Skeleton loading
  if (loading && channels.length === 0) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-5">
          <Tv2Icon className="w-4 h-4" style={{ color: 'var(--color-accent-500)' }} />
          <h3 className="text-sm font-bold" style={{ color: 'var(--color-surface-800)' }}>Your Channels</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3.5 rounded-xl"
              style={{ background: 'var(--color-surface-50)', border: '1px solid var(--color-surface-200)' }}
            >
              <div className="skeleton w-10 h-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3 rounded-md" style={{ width: '70%' }} />
                <div className="skeleton h-2.5 rounded-md" style={{ width: '50%' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #ff0000, #cc0000)', boxShadow: '0 2px 6px rgba(255,0,0,0.2)' }}
          >
            <YoutubeIcon className="w-4 h-4 text-white" style={{ color: 'white' }} />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: 'var(--color-surface-800)' }}>Your Channels</h3>
            {channels.length > 0 && (
              <p className="text-xs" style={{ color: 'var(--color-surface-400)' }}>{channels.length} subscribed</p>
            )}
          </div>
        </div>

        {/* Search */}
        {channels.length > 0 && (
          <div className="relative w-full sm:max-w-xs shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-surface-400)' }} />
            <input
              type="text"
              placeholder="Filter channels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-light text-xs"
              style={{ paddingLeft: '2.25rem', paddingTop: '6px', paddingBottom: '6px' }}
            />
          </div>
        )}
      </div>

      {/* Empty state */}
      {channels.length === 0 ? (
        <div className="text-center py-10">
          <div
            className="w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--color-surface-100)', border: '1px solid var(--color-surface-200)' }}
          >
            <YoutubeIcon className="w-7 h-7" style={{ color: 'var(--color-surface-400)' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-surface-700)' }}>No channels yet</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-surface-400)' }}>Add a channel using the form</p>
        </div>
      ) : filteredChannels.length === 0 ? (
        <div className="text-center py-8 text-sm" style={{ color: 'var(--color-surface-400)' }}>
          No channels match "{searchQuery}"
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[580px] overflow-y-auto sidebar-scroll pr-1">
          {filteredChannels.map((channel, index) => {
            const isRemoving = removingId === channel.channel_id;
            const initial = (channel.name || "?").charAt(0).toUpperCase();

            // Generate a consistent color from the channel name
            const colors = [
              ['#dbeafe', '#1d4ed8'], ['#f3e8ff', '#7c3aed'],
              ['#dcfce7', '#15803d'], ['#ffedd5', '#c2410c'],
              ['#fce7f3', '#be185d'], ['#e0f2fe', '#0369a1'],
            ];
            const colorPair = colors[channel.channel_id?.charCodeAt(2) % colors.length] || colors[0];

            return (
              <div
                key={channel.$id ?? channel.id ?? channel.channel_id}
                className="group flex items-center justify-between p-3.5 rounded-xl transition-all duration-200 animate-fade-in-up"
                style={{
                  animationDelay: `${(index % 15) * 0.03}s`,
                  opacity: isRemoving ? 0.5 : undefined,
                  background: '#ffffff',
                  border: '1px solid var(--color-surface-200)',
                  boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
                  transition: 'all 0.18s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--color-surface-300)';
                  e.currentTarget.style.boxShadow = '0 3px 10px rgba(15,23,42,0.08)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--color-surface-200)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(15,23,42,0.04)';
                  e.currentTarget.style.transform = '';
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
                    style={{ background: colorPair[0], color: colorPair[1] }}
                  >
                    {initial}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-surface-800)' }}>
                      {channel.name || channel.channel_id}
                    </p>
                    <p className="text-[10px] truncate font-mono" style={{ color: 'var(--color-surface-400)' }}>
                      {channel.channel_id}
                    </p>
                  </div>
                </div>

                {/* Remove button */}
                <button
                  id={`remove-channel-${channel.channel_id}`}
                  onClick={() => handleRemove(channel.channel_id)}
                  disabled={isRemoving}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg cursor-pointer transition-all duration-200 ml-2 shrink-0"
                  style={{ color: 'var(--color-surface-400)', border: '1px solid transparent' }}
                  title="Unsubscribe"
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#fef2f2';
                    e.currentTarget.style.color = '#ef4444';
                    e.currentTarget.style.borderColor = '#fecaca';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '';
                    e.currentTarget.style.color = 'var(--color-surface-400)';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
