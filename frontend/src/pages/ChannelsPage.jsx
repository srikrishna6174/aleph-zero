import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useChannels } from "../hooks/useChannels";
import Layout from "../components/Layout";
import AddChannelForm from "../components/AddChannelForm";
import ChannelList from "../components/ChannelList";
import { Users, Info } from "lucide-react";

export default function ChannelsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const {
    channels,
    loading: channelsLoading,
    addChannel,
    removeChannel,
    updateChannelName,
  } = useChannels();

  const subscribedChannelIds = useMemo(
    () =>
      channels
        .map((ch) => ch.channel_id ?? ch.data?.channel_id)
        .filter(Boolean),
    [channels],
  );

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

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
      <title>Channels — TubeDigest</title>

      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold uppercase tracking-widest text-blue-400">
            Subscriptions
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2.5">
          Your Channels
        </h1>
        <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
          Manage the YouTube creators tracked by TubeDigest. New uploads are
          automatically fetched via RSS and summarized with Gemini 3.6 Flash.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
        {/* Add Channel Form */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <AddChannelForm
            onAddChannel={addChannel}
            subscribedChannelIds={subscribedChannelIds}
          />

          <div className="glass-card p-5 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all duration-500" />

            <div className="flex items-center gap-2 mb-4">
              <Info className="w-4 h-4 text-blue-400" />
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                How it works
              </p>
            </div>

            <ol className="space-y-3.5 text-sm text-zinc-300 relative z-10">
              {[
                "Add any YouTube channel by URL, @handle, video link, or ID",
                "Worker checks RSS feeds hourly (or instantly via Sync Now)",
                "Multi-layer transcript extractor captures captions & translations",
                "Gemini AI generates clean, structured summaries in real time",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {i + 1}
                  </span>
                  <span className="leading-snug">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Channel List */}
        <div className="lg:col-span-2">
          <div className="glass-card p-6 h-full min-h-[420px]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
                Tracked Channels
                <span className="badge badge-gray">{channels.length}</span>
              </h2>
            </div>
            <ChannelList
              channels={channels}
              onRemoveChannel={removeChannel}
              onRenameChannel={updateChannelName}
              loading={channelsLoading}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
