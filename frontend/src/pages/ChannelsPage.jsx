import { useEffect } from "react";
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
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-5 h-5 text-blue-400" />
          <span className="text-xs font-bold uppercase tracking-widest text-blue-400">
            Subscriptions
          </span>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-3">
          Your Channels
        </h1>
        <p className="text-sm text-gray-400 max-w-2xl leading-relaxed">
          Manage the channels you want the AI worker to track. New videos will be automatically fetched and summarized every hour using Gemini 2.0.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add Channel Form */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <AddChannelForm
            onAddChannel={addChannel}
            loading={channelsLoading}
          />

          {/* Info card */}
          <div className="glass-card p-5 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all duration-500"></div>
            
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-4 h-4 text-blue-400" />
              <p className="text-xs font-bold uppercase tracking-wider text-gray-200">How it works</p>
            </div>
            
            <ol className="space-y-4 text-sm text-gray-300 relative z-10">
              {[
                "Add a YouTube channel by URL, handle, or ID",
                "Worker runs every hour via GitHub Actions",
                "New videos are fetched via RSS feed",
                "Gemini AI generates concise summaries",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
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
          <div className="glass-card p-6 h-full min-h-[400px]">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              Tracked Channels
              <span className="badge badge-gray ml-2">{channels.length}</span>
            </h2>
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
