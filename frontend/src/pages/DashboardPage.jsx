/**
 * DashboardPage
 * ==============
 * Overview page showing stats and recent activity — light theme.
 */

import { useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useChannels } from "../hooks/useChannels";
import { useSummaries } from "../hooks/useSummaries";
import Layout from "../components/Layout";
import StatsBar from "../components/StatsBar";
import SummaryFeed from "../components/SummaryFeed";
import { ArrowRight, Plus, Sparkles } from "lucide-react";

export default function DashboardPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { channels } = useChannels();

  const subscribedChannelIds = useMemo(
    () => channels.map((ch) => ch.channel_id ?? ch.data?.channel_id).filter(Boolean),
    [channels]
  );

  const {
    summaries,
    loading: summariesLoading,
    hasMore,
    loadMore,
    refresh,
    retrySummary,
  } = useSummaries(subscribedChannelIds);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const greeting = getGreeting();
  const firstName = (user?.name || user?.email || "").split(/[\s@]/)[0];

  if (authLoading) return null;
  if (!isAuthenticated) return null;

  return (
    <Layout>
      <title>Overview — TubeDigest</title>

      {/* Welcome Header */}
      <div className="mb-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5" style={{ color: 'var(--color-accent-500)' }} />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-accent-600)' }}>
                Dashboard
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--color-surface-900)' }}>
              {greeting},{" "}
              <span
                style={{
                  background: 'linear-gradient(135deg, var(--color-accent-600), var(--color-indigo-500))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {firstName || "there"}
              </span>{" "}👋
            </h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--color-surface-500)' }}>
              Here's what your AI engine has been processing recently.
            </p>
          </div>

          {channels.length === 0 && (
            <Link
              to="/channels"
              className="btn-primary shrink-0 self-start"
              style={{ borderRadius: '12px', padding: '10px 18px' }}
            >
              <Plus className="w-4 h-4" />
              Track your first channel
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <StatsBar channels={channels} summaries={summaries} />

      {/* Divider */}
      <div className="my-6" style={{ borderTop: '1px solid var(--color-surface-200)' }} />

      {/* Recent Feed */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--color-surface-900)' }}>Recent Activity</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-surface-400)' }}>Showing latest 5 processed videos</p>
          </div>
          <Link
            to="/library"
            className="flex items-center gap-1.5 text-sm font-semibold transition-colors"
            style={{ color: 'var(--color-accent-600)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent-800)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-accent-600)'; }}
          >
            View all
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <SummaryFeed
          summaries={summaries}
          channels={channels}
          loading={summariesLoading}
          hasMore={hasMore}
          onLoadMore={loadMore}
          onRefresh={refresh}
          limit={5}
          onRetry={retrySummary}
        />
      </div>
    </Layout>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
