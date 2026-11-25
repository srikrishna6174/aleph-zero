import {
  fetchChannelFeedVideos,
  inspectVideoUrl,
} from "../server/youtubeFeed.js";

export default async function handler(req, res) {
  const channelId =
    typeof req.query?.channelId === "string" ? req.query.channelId.trim() : "";
  const videoUrl =
    typeof req.query?.videoUrl === "string" ? req.query.videoUrl.trim() : "";

  try {
    if (videoUrl) {
      const video = await inspectVideoUrl(videoUrl);
      res.status(200).json({ videos: [video] });
      return;
    }

    if (channelId) {
      const videos = await fetchChannelFeedVideos(channelId);
      res.status(200).json({ videos });
      return;
    }

    res
      .status(400)
      .json({ error: "Provide either 'channelId' or 'videoUrl' query parameter." });
  } catch (err) {
    res.status(422).json({
      error: err?.message || "Failed to fetch YouTube videos.",
    });
  }
}
