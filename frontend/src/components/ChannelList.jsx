import { useState, useMemo } from "react";
import { Search, Trash2 } from "lucide-react";

const YoutubeIcon = ({ className, style }) => (
  <svg className={className} style={style} fill="currentColor" viewBox="0 0 24 24">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/>
    <path fill="var(--color-surface-900)" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
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

  if (loading && channels.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
            <div className="skeleton w-12 h-12 rounded-xl shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="skeleton h-3.5 rounded-md w-3/4" />
              <div className="skeleton h-2.5 rounded-md w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        {channels.length > 0 && (
          <div className="relative w-full sm:max-w-xs shrink-0 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
            <input
              type="text"
              placeholder="Search channels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-light pl-10 py-2.5 text-sm"
            />
          </div>
        )}
      </div>

      {channels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-20 h-20 mb-6 rounded-2xl flex items-center justify-center bg-white/5 border border-white/10 shadow-lg relative">
            <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full"></div>
            <YoutubeIcon className="w-10 h-10 text-gray-400 relative z-10" />
          </div>
          <p className="text-lg font-bold text-gray-200 mb-2 tracking-wide">No channels tracked yet</p>
          <p className="text-sm text-gray-400 max-w-sm text-center">Use the form to add a channel and the AI will begin tracking it.</p>
        </div>
      ) : filteredChannels.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white/5 rounded-2xl border border-white/5">
          <p className="text-lg">No channels match "<span className="text-white">{searchQuery}</span>"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto sidebar-scroll pr-2 pb-4">
          {filteredChannels.map((channel, index) => {
            const isRemoving = removingId === channel.channel_id;
            const initial = (channel.name || "?").charAt(0).toUpperCase();

            const colors = [
              ['#3b82f6', '#eff6ff'], // blue
              ['#8b5cf6', '#f5f3ff'], // violet
              ['#10b981', '#ecfdf5'], // emerald
              ['#f59e0b', '#fffbeb'], // amber
              ['#ec4899', '#fdf2f8'], // pink
              ['#06b6d4', '#ecfeff'], // cyan
            ];
            const colorPair = colors[channel.channel_id?.charCodeAt(2) % colors.length] || colors[0];

            return (
              <div
                key={channel.$id ?? channel.id ?? channel.channel_id}
                className="group flex items-center justify-between p-4 rounded-xl transition-all duration-300 animate-fade-in-up hover:-translate-y-1 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
                style={{
                  animationDelay: `${(index % 15) * 0.04}s`,
                  opacity: isRemoving ? 0.5 : undefined,
                }}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-lg font-bold shadow-inner"
                    style={{ background: `linear-gradient(135deg, ${colorPair[0]}, #1e1b4b)`, color: colorPair[1] }}
                  >
                    {initial}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-100 truncate mb-1 tracking-wide">
                      {channel.name && channel.name !== channel.channel_id
                        ? channel.name
                        : <span className="italic text-gray-400 font-normal">Unknown Channel</span>
                      }
                    </p>
                    <p className="text-[10px] text-gray-500 truncate font-mono bg-black/20 inline-block px-1.5 py-0.5 rounded">
                      {channel.channel_id}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleRemove(channel.channel_id)}
                  disabled={isRemoving}
                  className="opacity-0 group-hover:opacity-100 p-2 rounded-lg cursor-pointer transition-all duration-200 ml-2 shrink-0 text-gray-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
                  title="Unsubscribe"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
