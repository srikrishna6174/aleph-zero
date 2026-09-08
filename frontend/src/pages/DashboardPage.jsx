/**
 * DashboardPage
 * ==============
 * Main dashboard view with stats overview, channel management sidebar,
 * and the AI summary feed.
 */

import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useChannels } from "../hooks/useChannels";
import { useSummaries } from "../hooks/useSummaries";
import Layout from "../components/Layout";
import StatsBar from "../components/StatsBar";
import AddChannelForm from "../components/AddChannelForm";
import ChannelList from "../components/ChannelList";
import SummaryFeed from "../components/SummaryFeed";

export default function DashboardPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const {
    channels,
    loading: channelsLoading,
    addChannel,
    removeChannel,
  } = useChannels();

  // Memoize channel IDs so the array reference stays stable across renders
  const subscribedChannelIds = useMemo(
    () => channels.map((ch) => ch.channel_id),
    [channels]
  );

  const {
    summaries,
    loading: summariesLoading,
    hasMore,
    loadMore,
    refresh,
  } = useSummaries(subscribedChannelIds);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Show nothing while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-500 to-info flex items-center justify-center shadow-lg shadow-accent-500/25 animate-float">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex items-center gap-3 text-surface-400 text-sm">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading your dashboard...
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const greeting = getGreeting();
  const firstName = (user?.name || user?.email || "").split(/[\s@]/)[0];

  return (
    <Layout>
      <title>Dashboard — TubeDigest</title>
      <meta name="description" content="Your personal dashboard for AI-generated YouTube video summaries." />

      {/* Welcome Header */}
      <div className="mb-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-surface-100">
          {greeting}, <span className="gradient-text">{firstName || "there"}</span>
        </h1>
        <p className="text-sm text-surface-500 mt-1">
          Your AI-generated video summaries, updated every hour.
        </p>
      </div>

      {/* Stats Overview */}
      <StatsBar channels={channels} summaries={summaries} />

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar — Channels */}
        <aside className="lg:w-80 shrink-0 space-y-4 lg:sticky lg:top-[5.5rem] lg:self-start">
          <AddChannelForm
            onAddChannel={addChannel}
            loading={channelsLoading}
          />
          <ChannelList
            channels={channels}
            onRemoveChannel={removeChannel}
            loading={channelsLoading}
          />
        </aside>

        {/* Main Feed */}
        <section className="flex-1 min-w-0">
          <SummaryFeed
            summaries={summaries}
            channels={channels}
            loading={summariesLoading}
            hasMore={hasMore}
            onLoadMore={loadMore}
            onRefresh={refresh}
          />
        </section>
      </div>
    </Layout>
  );
}

/**
 * Return a time-appropriate greeting.
 */
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
