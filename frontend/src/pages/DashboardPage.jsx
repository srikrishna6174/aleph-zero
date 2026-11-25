import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useChannels } from "../hooks/useChannels";
import { useSummaries } from "../hooks/useSummaries";
import Layout from "../components/Layout";
import StatsBar from "../components/StatsBar";
import SummaryFeed from "../components/SummaryFeed";
import { ArrowRight, Plus, Sparkles, RefreshCw } from "lucide-react";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { channels } = useChannels();

  const {
    summaries,
    stats,
    loading: summariesLoading,
    loadMore,
    refresh,
    retrySummary,
  } = useSummaries();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const greeting = getGreeting();
  const firstName = (user?.name || user?.email || "").split(/[\s@]/)[0];

  if (authLoading) {
    return (
      <div className="min-h-screen page-bg flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500/30 border-t-blue-400 animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) return null;

  return (
    <Layout>
      <title>Overview — TubeDigest</title>

      {/* Welcome Header */}
      <div className="mb-8 animate-fade-in-up">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-blue-400">
                Dashboard
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              {greeting},{" "}
              <span className="gradient-text">{firstName || "there"}</span>
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Here&apos;s what your AI engine has summarized across your
              subscriptions.
            </p>
          </div>

          {channels.length === 0 && (
            <Link
              to="/channels"
              className="btn-primary shrink-0 self-start shadow-[0_0_20px_rgba(59,130,246,0.3)]"
            >
              <Plus className="w-4 h-4" />
              Track your first channel
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <StatsBar channels={channels} summaries={summaries} stats={stats} />

      <div className="my-8 h-px bg-white/[0.08]" />

      {/* Recent Feed */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">
              Recent Activity
            </h2>
            <p className="text-sm mt-1 text-zinc-400">
              Showing latest 5 videos from your watchlist
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={refresh}
              disabled={summariesLoading}
              className="btn-secondary text-xs py-2 px-3.5"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${summariesLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
            <Link
              to="/library"
              className="flex items-center gap-1.5 text-sm font-bold transition-colors text-blue-400 hover:text-blue-300"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <SummaryFeed
          summaries={summaries}
          channels={channels}
          loading={summariesLoading}
          hasMore={false}
          onLoadMore={loadMore}
          onRefresh={refresh}
          limit={5}
          onRetry={retrySummary}
          showHeader={false}
        />
      </div>
    </Layout>
  );
}
