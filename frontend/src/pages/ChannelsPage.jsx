/**
 * ChannelsPage
 * =============
 * Dedicated page for managing tracked YouTube channels.
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useChannels } from "../hooks/useChannels";
import Layout from "../components/Layout";
import AddChannelForm from "../components/AddChannelForm";
import ChannelList from "../components/ChannelList";

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
      
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold text-surface-100 tracking-tight">
          Subscriptions
        </h1>
        <p className="text-surface-400 mt-2 max-w-2xl">
          Manage the channels you want the AI worker to track. New videos from these channels will be automatically fetched and summarized.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <AddChannelForm
            onAddChannel={addChannel}
            loading={channelsLoading}
          />
        </div>
        
        <div className="lg:col-span-2">
          <div className="glass rounded-2xl p-1 border border-surface-800/60 shadow-xl">
            <div className="bg-surface-900/40 rounded-xl p-6">
              <ChannelList
                channels={channels}
                onRemoveChannel={removeChannel}
                loading={channelsLoading}
              />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
