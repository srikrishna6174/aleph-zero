/**
 * StatsBar Component
 * ===================
 * Dashboard stat cards showing channel/video/summary metrics.
 */

export default function StatsBar({ channels, summaries }) {
  const totalChannels = channels.length;
  const totalVideos = summaries.length;
  const completedCount = summaries.filter((s) => s.status === "completed").length;
  const failedCount = summaries.filter((s) => s.status === "failed").length;

  const stats = [
    {
      label: "Channels",
      value: totalChannels,
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
          <path fill="white" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      ),
      color: "text-yt-red",
      bgGlow: "from-yt-red/10 to-yt-red/5",
    },
    {
      label: "Videos Tracked",
      value: totalVideos,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      color: "text-info",
      bgGlow: "from-info/10 to-info/5",
    },
    {
      label: "Summaries",
      value: completedCount,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      color: "text-accent-400",
      bgGlow: "from-accent-500/10 to-accent-500/5",
    },
    {
      label: "Failed",
      value: failedCount,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      color: failedCount > 0 ? "text-warning" : "text-surface-500",
      bgGlow: failedCount > 0 ? "from-warning/10 to-warning/5" : "from-surface-700/10 to-surface-700/5",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          className="stat-card-glow glass-card rounded-xl px-4 py-4 animate-fade-in-up"
          style={{ animationDelay: `${i * 0.08}s`, opacity: 0 }}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.bgGlow} flex items-center justify-center ${stat.color}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-100 leading-none">
                {stat.value}
              </p>
              <p className="text-xs text-surface-500 mt-0.5">{stat.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
