/**
 * StatsBar Component
 * ===================
 * Dashboard stat cards — light theme with colored icon backgrounds.
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
      iconBg: 'linear-gradient(135deg, #ff0000, #cc0000)',
      iconColor: '#fff',
      valueBg: '#fef2f2',
      valueColor: '#b91c1c',
      trend: totalChannels > 0 ? `${totalChannels} tracked` : 'None yet',
    },
    {
      label: "Videos Tracked",
      value: totalVideos,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      iconBg: 'linear-gradient(135deg, #0ea5e9, #38bdf8)',
      iconColor: '#fff',
      valueBg: '#f0f9ff',
      valueColor: '#0369a1',
      trend: totalVideos > 0 ? 'Since tracking began' : 'Add channels to start',
    },
    {
      label: "AI Summaries",
      value: completedCount,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      iconBg: 'linear-gradient(135deg, #2563eb, #6366f1)',
      iconColor: '#fff',
      valueBg: 'var(--color-accent-50)',
      valueColor: 'var(--color-accent-700)',
      trend: completedCount > 0 ? `${Math.round((completedCount / Math.max(totalVideos, 1)) * 100)}% success rate` : 'Waiting for videos',
    },
    {
      label: "Failed",
      value: failedCount,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      iconBg: failedCount > 0 ? 'linear-gradient(135deg, #f59e0b, #fbbf24)' : 'linear-gradient(135deg, #cbd5e1, #94a3b8)',
      iconColor: '#fff',
      valueBg: failedCount > 0 ? '#fffbeb' : 'var(--color-surface-50)',
      valueColor: failedCount > 0 ? '#b45309' : 'var(--color-surface-400)',
      trend: failedCount > 0 ? 'Use retry to reprocess' : 'All good!',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          className="stat-card-glow rounded-2xl p-5 animate-fade-in-up"
          style={{
            animationDelay: `${i * 0.07}s`,
            opacity: 0,
            background: '#ffffff',
            border: '1px solid var(--color-surface-200)',
            boxShadow: '0 1px 4px rgba(15,23,42,0.06)',
            transition: 'all 0.22s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(15,23,42,0.1)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.boxShadow = '0 1px 4px rgba(15,23,42,0.06)';
            e.currentTarget.style.transform = '';
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: stat.iconBg, color: stat.iconColor, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
            >
              {stat.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-2xl font-bold leading-none" style={{ color: 'var(--color-surface-900)' }}>
                {stat.value}
              </p>
              <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--color-surface-500)' }}>{stat.label}</p>
            </div>
          </div>
          <p className="text-[11px] mt-3 truncate" style={{ color: 'var(--color-surface-400)' }}>
            {stat.trend}
          </p>
        </div>
      ))}
    </div>
  );
}
