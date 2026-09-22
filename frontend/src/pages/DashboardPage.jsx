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
      <div className="mb-10 animate-fade-in-up">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-blue-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-blue-400">
                Dashboard
              </span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
              {greeting},{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                {firstName || "there"}
              </span>{" "}👋
            </h1>
            <p className="mt-2 text-sm text-gray-400">
              Here's what your AI engine has been processing recently.
            </p>
          </div>

          {channels.length === 0 && (
            <Link
              to="/channels"
              className="btn-primary shrink-0 self-start shadow-[0_0_20px_rgba(59,130,246,0.3)]"
              style={{ borderRadius: '12px', padding: '12px 24px' }}
            >
              <Plus className="w-5 h-5" />
              Track your first channel
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <StatsBar channels={channels} summaries={summaries} />

      {/* Divider */}
      <div className="my-8 h-px bg-white/10" />

      {/* Recent Feed */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">Recent Activity</h2>
            <p className="text-sm mt-1 text-gray-400">Showing latest 5 processed videos</p>
          </div>
          <Link
            to="/library"
            className="flex items-center gap-1.5 text-sm font-bold transition-colors text-blue-400 hover:text-blue-300"
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
