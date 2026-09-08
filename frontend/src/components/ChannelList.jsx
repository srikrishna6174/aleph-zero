/**
 * ChannelList Component
 * ======================
 * Sidebar list of the user's subscribed YouTube channels
 * with unsubscribe functionality.
 */

export default function ChannelList({ channels, onRemoveChannel, loading }) {
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
        {/* Skeleton loading */}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="skeleton w-9 h-9 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
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
      <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4 flex items-center gap-2">
        <svg className="w-4 h-4 text-yt-red" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
          <path fill="white" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
        Your Channels
        {channels.length > 0 && (
          <span className="ml-auto text-xs bg-surface-700 px-2 py-0.5 rounded-full text-surface-400">
            {channels.length}
          </span>
        )}
      </h3>

      {channels.length === 0 ? (
        <div className="text-center py-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-surface-800 flex items-center justify-center">
            <svg className="w-6 h-6 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <p className="text-sm text-surface-500">No channels yet</p>
          <p className="text-xs text-surface-600 mt-1">Add a channel above to get started</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {channels.map((channel, index) => (
            <li
              key={channel.$id}
              className="group flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-800/60 transition-all duration-200 animate-fade-in-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {/* Channel avatar */}
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-500 to-info flex items-center justify-center shrink-0 text-white text-sm font-bold shadow-md shadow-accent-500/20">
                {(channel.name || "?").charAt(0).toUpperCase()}
              </div>

              {/* Channel info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-200 truncate">
                  {channel.name}
                </p>
                <p className="text-xs text-surface-500 truncate">
                  {channel.channel_id}
                </p>
              </div>

              {/* Remove button */}
              <button
                id={`remove-channel-${channel.channel_id}`}
                onClick={() => onRemoveChannel(channel.channel_id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-error/15 text-surface-500 hover:text-error transition-all duration-200 cursor-pointer"
                title="Unsubscribe"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
