export default function StatsBar({
  channels = [],
  summaries = [],
  stats = null,
}) {
  const safeChannels = Array.isArray(channels) ? channels : [];
  const safeSummaries = Array.isArray(summaries) ? summaries : [];

  const totalChannels = safeChannels.length;
  const totalVideos = stats ? stats.total : safeSummaries.length;
  const completedCount = stats
    ? stats.completed
    : safeSummaries.filter((s) => s?.status === "completed").length;
  const failedCount = stats
    ? stats.failed
    : safeSummaries.filter((s) => s?.status === "failed").length;

  const cards = [
    {
      label: "Channels",
      value: totalChannels,
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
          <path
            fill="currentColor"
            d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z"
            className="text-red-950"
          />
        </svg>
      ),
      iconBg: "linear-gradient(135deg, #ef4444, #b91c1c)",
      iconColor: "#fff",
      trend: totalChannels > 0 ? `${totalChannels} active` : "None yet",
    },
    {
      label: "Videos Tracked",
      value: totalVideos,
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      ),
      iconBg: "linear-gradient(135deg, #3b82f6, #0ea5e9)",
      iconColor: "#fff",
      trend: totalVideos > 0 ? "All tracked channels" : "Add channels to start",
    },
    {
      label: "AI Summaries",
      value: completedCount,
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
      iconBg: "linear-gradient(135deg, #8b5cf6, #6366f1)",
      iconColor: "#fff",
      trend:
        completedCount > 0
          ? `${Math.round((completedCount / Math.max(totalVideos, 1)) * 100)}% completion rate`
          : "Waiting for videos",
    },
    {
      label: "Failed",
      value: failedCount,
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      ),
      iconBg:
        failedCount > 0
          ? "linear-gradient(135deg, #f59e0b, #d97706)"
          : "linear-gradient(135deg, #3f3f46, #27272a)",
      iconColor: failedCount > 0 ? "#fff" : "#a1a1aa",
      trend: failedCount > 0 ? "Use retry to reprocess" : "All clear",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {cards.map((stat, i) => (
        <div
          key={stat.label}
          className="glass-card p-3.5 sm:p-5 animate-fade-in-up relative overflow-hidden group"
          style={{ animationDelay: `${i * 0.05}s` }}
        >
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/[0.04] rounded-full blur-2xl group-hover:bg-white/[0.08] transition-colors" />

          <div className="flex items-start gap-2.5 sm:gap-3.5 relative z-10">
            <div
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
              style={{ background: stat.iconBg, color: stat.iconColor }}
            >
              {stat.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-2xl sm:text-3xl font-extrabold leading-none text-white tracking-tight mb-1">
                {stat.value}
              </p>
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                {stat.label}
              </p>
            </div>
          </div>
          <p className="text-[11px] mt-3 sm:mt-3.5 font-medium text-zinc-500 leading-snug relative z-10">
            {stat.trend}
          </p>
        </div>
      ))}
    </div>
  );
}
