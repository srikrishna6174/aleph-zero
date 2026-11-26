import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useChannels } from "../hooks/useChannels";
import { useSummaries } from "../hooks/useSummaries";
import Layout from "../components/Layout";
import StatsBar from "../components/StatsBar";
import SummaryFeed from "../components/SummaryFeed";
import { ArrowRight, Plus, RefreshCw, ListPlus } from "lucide-react";

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
    setRequestModalOpen,
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
        <div className="w-8 h-8 rounded-full border-2 border-stone-300 border-t-stone-800 animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) return null;

  return (
    <Layout>
      <title>Overview — TubeDigest</title>

      {/* Welcome Header */}
      <div className="mb-7 animate-fade-in-up">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
              Overview
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900">
              {greeting},{" "}
              <span className="text-red-600">{firstName || "there"}</span>
            </h1>
            <p className="mt-1.5 text-sm text-stone-600">
              Catch up on structured summaries across your YouTube watchlist.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0 self-start">
            <button
              id="dashboard-request-summary-btn"
              type="button"
              onClick={() => setRequestModalOpen(true)}
              className="btn-primary"
            >
              <ListPlus className="w-4 h-4" />
              Select Videos &amp; Request Summary
            </button>

            {channels.length === 0 && (
              <Link to="/channels" className="btn-secondary">
                <Plus className="w-4 h-4" />
                Track your first channel
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <StatsBar channels={channels} summaries={summaries} stats={stats} />

      <div className="my-7 h-px bg-[#e6e3dc]" />

      {/* Recent Feed */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-xl font-bold text-stone-900 tracking-tight">
              Recent Activity
            </h2>
            <p className="text-sm mt-0.5 text-stone-500">
              Latest 5 full-length videos from your watchlist
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
              className="flex items-center gap-1.5 text-sm font-semibold transition-colors text-stone-700 hover:text-stone-950"
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
