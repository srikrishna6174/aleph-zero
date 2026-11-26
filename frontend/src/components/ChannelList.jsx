import { useState, useMemo } from "react";
import { Search, Trash2, ExternalLink, Pencil, Check, X } from "lucide-react";
import toast from "react-hot-toast";

const YoutubeIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
    <path fill="#ffffff" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const AVATAR_COLORS = [
  ["#eff6ff", "#1d4ed8", "#bfdbfe"],
  ["#f5f3ff", "#6d28d9", "#ddd6fe"],
  ["#ecfdf5", "#047857", "#a7f3d0"],
  ["#fffbeb", "#b45309", "#fde68a"],
  ["#fef2f2", "#b91c1c", "#fecaca"],
  ["#ecfeff", "#0e7490", "#a5f3fc"],
];

function ChannelAvatar({ channel, displayName }) {
  const [imgFailed, setImgFailed] = useState(false);
  const avatarUrl = channel.thumbnail_url || "";
  const initial = displayName.charAt(0).toUpperCase();
  const colorTriple =
    AVATAR_COLORS[(channel.channel_id?.charCodeAt(2) || 0) % AVATAR_COLORS.length] ||
    AVATAR_COLORS[0];

  if (avatarUrl && !imgFailed) {
    return (
      <img
        src={avatarUrl}
        alt={displayName}
        referrerPolicy="no-referrer"
        className="w-11 h-11 rounded-xl object-cover shrink-0 border border-stone-200 shadow-xs bg-stone-100"
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div
      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-base font-bold border"
      style={{
        background: colorTriple[0],
        color: colorTriple[1],
        borderColor: colorTriple[2],
      }}
    >
      {initial}
    </div>
  );
}

export default function ChannelList({
  channels = [],
  onRemoveChannel,
  onRenameChannel,
  loading = false,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [removingId, setRemovingId] = useState(null);
  const [editingDocId, setEditingDocId] = useState(null);
  const [editValue, setEditValue] = useState("");

  const safeChannels = useMemo(
    () => (Array.isArray(channels) ? channels : []),
    [channels],
  );

  const filteredChannels = useMemo(() => {
    if (!searchQuery) return safeChannels;
    const q = searchQuery.toLowerCase().trim();
    return safeChannels.filter((c) => {
      const name = (c.name || "").toLowerCase();
      const cid = (c.channel_id || "").toLowerCase();
      return name.includes(q) || cid.includes(q);
    });
  }, [safeChannels, searchQuery]);

  const handleRemove = async (channelId, displayName) => {
    setRemovingId(channelId);
    try {
      await onRemoveChannel(channelId);
      toast.success(`Unsubscribed from ${displayName}`);
    } catch (err) {
      toast.error(err?.message || "Failed to unsubscribe");
    } finally {
      setRemovingId(null);
    }
  };

  const startEdit = (channel, displayName) => {
    setEditingDocId(channel.$id ?? channel.id);
    setEditValue(
      channel.name && channel.name !== channel.channel_id
        ? channel.name
        : displayName,
    );
  };

  const saveEdit = async (channel) => {
    const docId = channel.$id ?? channel.id;
    const trimmed = editValue.trim();
    if (!trimmed || !onRenameChannel) {
      setEditingDocId(null);
      return;
    }
    const ok = await onRenameChannel(docId, trimmed);
    if (ok) {
      toast.success(`Renamed to ${trimmed}`);
    } else {
      toast.error("Could not update channel name");
    }
    setEditingDocId(null);
  };

  if (loading && safeChannels.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 rounded-xl bg-stone-50 border border-stone-200/70"
          >
            <div className="skeleton w-11 h-11 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2.5">
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
      {safeChannels.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div className="relative w-full sm:max-w-xs shrink-0 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-stone-800 transition-colors" />
            <input
              type="text"
              placeholder="Search tracked channels…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-light pl-10 py-2 text-sm w-full"
            />
          </div>
        </div>
      )}

      {safeChannels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-16 h-16 mb-5 rounded-2xl flex items-center justify-center bg-red-50 border border-red-100">
            <YoutubeIcon className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-lg font-bold text-stone-900 mb-1.5">
            No channels tracked yet
          </p>
          <p className="text-sm text-stone-500 max-w-sm text-center">
            Use the form or popular channel presets on the left to start
            receiving structured video digests.
          </p>
        </div>
      ) : filteredChannels.length === 0 ? (
        <div className="text-center py-12 text-stone-500 bg-[#fafaf8] rounded-2xl border border-[#e6e3dc]">
          <p className="text-sm">
            No channels match &ldquo;
            <span className="text-stone-900 font-semibold">{searchQuery}</span>
            &rdquo;
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[600px] overflow-y-auto sidebar-scroll pr-1 pb-2">
          {filteredChannels.map((channel, index) => {
            const docId = channel.$id ?? channel.id ?? channel.channel_id;
            const isRemoving = removingId === channel.channel_id;
            const isEditing = editingDocId === docId;
            const displayName =
              channel.name && channel.name !== channel.channel_id
                ? channel.name
                : `Channel ${channel.channel_id.substring(0, 8)}…`;

            return (
              <div
                key={docId}
                data-channel-id={channel.channel_id}
                className="group flex items-center justify-between gap-3 p-3.5 rounded-xl transition-all duration-150 animate-fade-in-up bg-[#fafaf8] hover:bg-white border border-[#e6e3dc] hover:border-[#d2cdc2] hover:shadow-xs"
                style={{
                  animationDelay: `${(index % 15) * 0.03}s`,
                  opacity: isRemoving ? 0.5 : 1,
                }}
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <ChannelAvatar channel={channel} displayName={displayName} />

                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 mb-1">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(channel);
                            if (e.key === "Escape") setEditingDocId(null);
                          }}
                          autoFocus
                          className="input-light py-1 px-2 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => saveEdit(channel)}
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                          title="Save"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingDocId(null)}
                          className="p-1.5 rounded-lg bg-stone-100 text-stone-500 hover:text-stone-800 cursor-pointer"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <p
                        className="text-sm font-bold text-stone-900 truncate mb-1"
                        title={displayName}
                      >
                        {displayName}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-stone-500 truncate font-mono bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200/80">
                        {channel.channel_id}
                      </span>
                      <a
                        href={`https://www.youtube.com/channel/${channel.channel_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-stone-400 hover:text-stone-800 transition-colors"
                        title="Open channel on YouTube"
                      >
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                </div>

                {!isEditing && (
                  <div className="flex items-center gap-1 shrink-0">
                    {onRenameChannel && (
                      <button
                        type="button"
                        onClick={() => startEdit(channel, displayName)}
                        className="p-2 rounded-lg cursor-pointer transition-colors text-stone-400 hover:text-stone-900 hover:bg-stone-100 sm:opacity-65 sm:group-hover:opacity-100 focus:opacity-100"
                        title="Rename channel"
                        aria-label={`Rename ${displayName}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemove(channel.channel_id, displayName)}
                      disabled={isRemoving}
                      className="p-2 rounded-lg cursor-pointer transition-colors text-stone-400 hover:text-red-600 hover:bg-red-50 sm:opacity-65 sm:group-hover:opacity-100 focus:opacity-100"
                      title="Unsubscribe from channel"
                      aria-label={`Unsubscribe from ${displayName}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
