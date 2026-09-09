/**
 * DashboardPage
 * ==============
 * Overview page showing stats and recent activity.
 */

import { useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useChannels } from "../hooks/useChannels";
import { useSummaries } from "../hooks/useSummaries";
import Layout from "../components/Layout";
import StatsBar from "../components/StatsBar";
import SummaryFeed from "../components/SummaryFeed";
import { ArrowRight } from "lucide-react";

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
      <div className="mb-8 animate-fade-in flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-surface-100 tracking-tight">
            {greeting}, <span className="gradient-text">{firstName || "there"}</span>
          </h1>
          <p className="text-surface-400 mt-2">
            Here's what your AI engine has been processing recently.
          </p>
        </div>
        
        {channels.length === 0 && (
          <Link 
            to="/channels" 
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent-600 hover:bg-accent-500 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-accent-500/20"
          >
            Track your first channel <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Stats Overview */}
      <StatsBar channels={channels} summaries={summaries} />

      {/* Recent Feed */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-surface-100">Recent Activity</h2>
          <Link to="/library" className="text-sm font-medium text-accent-400 hover:text-accent-300 transition-colors">
            View full library &rarr;
          </Link>
        </div>
        
        <SummaryFeed
          summaries={summaries}
          channels={channels}
          loading={summariesLoading}
          hasMore={hasMore}
          onLoadMore={loadMore}
          onRefresh={refresh}
          limit={5} /* Limit feed on dashboard */
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
