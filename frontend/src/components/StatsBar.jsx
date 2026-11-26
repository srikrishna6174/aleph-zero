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
            fill="#ffffff"
            d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z"
          />
        </svg>
      ),
      wellClass: "bg-red-50 text-red-600 border-red-100",
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
      wellClass: "bg-blue-50 text-blue-600 border-blue-100",
      trend: totalVideos > 0 ? "All tracked channels" : "Add channels to start",
    },
    {
      label: "Summaries",
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
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
      wellClass: "bg-emerald-50 text-emerald-700 border-emerald-100",
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
      wellClass:
        failedCount > 0
          ? "bg-amber-50 text-amber-600 border-amber-200"
          : "bg-stone-100 text-stone-500 border-stone-200",
      trend: failedCount > 0 ? "Use retry to reprocess" : "All clear",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {cards.map((stat, i) => (
        <div
          key={stat.label}
          className="glass-card p-3.5 sm:p-5 animate-fade-in-up"
          style={{ animationDelay: `${i * 0.04}s` }}
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 border ${stat.wellClass}`}
            >
              {stat.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-2xl sm:text-3xl font-extrabold leading-none text-stone-900 tracking-tight mb-1">
                {stat.value}
              </p>
              <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                {stat.label}
              </p>
            </div>
          </div>
          <p className="text-xs mt-3 font-medium text-stone-500 leading-snug">
            {stat.trend}
          </p>
        </div>
      ))}
    </div>
  );
}
