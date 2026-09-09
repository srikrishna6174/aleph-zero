/**
 * ChannelList Component
 * ======================
 * Sidebar list of the user's subscribed YouTube channels
 * with unsubscribe functionality.
 */

import { useState, useMemo } from "react";
import { Search } from "lucide-react";

export default function ChannelList({ channels, onRemoveChannel, loading }) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredChannels = useMemo(() => {
    if (!searchQuery) return channels;
    const q = searchQuery.toLowerCase();
    return channels.filter(c => 
      c.name?.toLowerCase().includes(q) || c.channel_id.toLowerCase().includes(q)
    );
  }, [channels, searchQuery]);

  if (loading && channels.length === 0) {
    return (
      <div className="glass rounded-xl p-5">
        <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-yt-red" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
            <path fill="white" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
          Your Channels
        </h3>
        {/* Skeleton loading grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-surface-800">
              <div className="skeleton w-10 h-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3 w-3/4 rounded" />
                <div className="skeleton h-2 w-1/2 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider flex items-center gap-2">
          <svg className="w-4 h-4 text-yt-red" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
            <path fill="white" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
          Your Channels
          {channels.length > 0 && (
            <span className="ml-2 text-xs bg-surface-700 px-2 py-0.5 rounded-full text-surface-400">
              {channels.length}
            </span>
          )}
        </h3>

        {/* Local Search for Channels */}
        {channels.length > 0 && (
          <div className="relative w-full sm:max-w-xs shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <input 
              type="text" 
              placeholder="Filter channels..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-900 border border-surface-700 rounded-lg py-1.5 pr-3 text-xs text-surface-100 placeholder-surface-500 focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/50 transition-all"
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>
        )}
      </div>

      {channels.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-surface-800 flex items-center justify-center">
            <svg className="w-6 h-6 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <p className="text-sm text-surface-500">No channels yet</p>
          <p className="text-xs text-surface-600 mt-1">Add a channel to get started</p>
        </div>
      ) : filteredChannels.length === 0 ? (
        <div className="text-center py-6 text-sm text-surface-500">
          No channels match your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto sidebar-scroll pr-2">
          {filteredChannels.map((channel, index) => (
            <div
              key={channel.$id ?? channel.id ?? channel.channel_id}
              className="group flex items-center justify-between p-3 rounded-xl bg-surface-900/50 border border-surface-800 hover:border-surface-600 hover:bg-surface-800/80 transition-all duration-200 animate-fade-in-up"
              style={{ animationDelay: `${(index % 15) * 0.03}s` }}
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Channel avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-surface-700 to-surface-600 flex items-center justify-center shrink-0 text-white text-sm font-bold shadow-md shadow-black/20 border border-surface-600/50 group-hover:border-accent-500/30 transition-colors">
                  {(channel.name || "?").charAt(0).toUpperCase()}
                </div>

                {/* Channel info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-200 truncate group-hover:text-white transition-colors">
                    {channel.name}
                  </p>
                  <p className="text-[10px] text-surface-500 truncate font-mono mt-0.5">
                    {channel.channel_id}
                  </p>
                </div>
              </div>

              {/* Remove button */}
              <button
                id={`remove-channel-${channel.channel_id}`}
                onClick={() => onRemoveChannel(channel.channel_id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-error/15 text-surface-500 hover:text-error transition-all duration-200 cursor-pointer shrink-0"
                title="Unsubscribe"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
