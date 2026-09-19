/**
 * ChannelsPage
 * =============
 * Manage tracked YouTube channels — light theme.
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useChannels } from "../hooks/useChannels";
import Layout from "../components/Layout";
import AddChannelForm from "../components/AddChannelForm";
import ChannelList from "../components/ChannelList";
import { Users } from "lucide-react";

export default function ChannelsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const {
    channels,
    loading: channelsLoading,
    addChannel,
    removeChannel,
  } = useChannels();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  if (authLoading) return null;
  if (!isAuthenticated) return null;

  return (
    <Layout>
      <title>Channels — TubeDigest</title>

      {/* Page Header */}
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-5 h-5" style={{ color: 'var(--color-accent-500)' }} />
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-accent-600)' }}>
            Subscriptions
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--color-surface-900)' }}>
          Your Channels
        </h1>
        <p className="text-sm mt-2 max-w-2xl" style={{ color: 'var(--color-surface-500)' }}>
          Manage the channels you want the AI worker to track. New videos will be automatically fetched and summarized every hour.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add Channel Form */}
        <div className="lg:col-span-1">
          <AddChannelForm
            onAddChannel={addChannel}
            loading={channelsLoading}
          />

          {/* Info card */}
          <div
            className="mt-4 rounded-2xl p-4"
            style={{
              background: 'linear-gradient(135deg, var(--color-accent-50), #ede9fe)',
              border: '1px solid var(--color-accent-200)',
            }}
          >
            <p className="text-xs font-bold mb-2" style={{ color: 'var(--color-accent-700)' }}>How it works</p>
            <ol className="space-y-1.5 text-xs" style={{ color: 'var(--color-accent-700)' }}>
              {[
                "Add a YouTube channel by URL or ID",
                "Worker runs every hour via GitHub Actions",
                "New videos are fetched via RSS feed",
                "Gemini AI generates concise summaries",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span
                    className="w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: 'var(--color-accent-600)', color: '#fff' }}
                  >
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Channel List */}
        <div className="lg:col-span-2">
          <div
            className="rounded-2xl p-6"
            style={{
              background: '#ffffff',
              border: '1px solid var(--color-surface-200)',
              boxShadow: '0 1px 4px rgba(15,23,42,0.06)',
            }}
          >
            <ChannelList
              channels={channels}
              onRemoveChannel={removeChannel}
              loading={channelsLoading}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
