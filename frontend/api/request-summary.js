import { summarizeVideosInNode } from "../server/summaryRunner.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = req.body || {};
  const videos = Array.isArray(body.videos) ? body.videos : [];
  const jwt = typeof body.jwt === "string" ? body.jwt : "";

  if (videos.length === 0) {
    res.status(400).json({ error: "No videos provided." });
    return;
  }

  const geminiKey = process.env.GEMINI_API_KEY || "";
  if (!geminiKey) {
    res.status(202).json({
      mode: "queued",
      message:
        "Videos queued in database. Add GEMINI_API_KEY in Vercel Environment Variables to enable instant cloud summarization.",
    });
    return;
  }

  const endpoint =
    process.env.APPWRITE_ENDPOINT ||
    process.env.VITE_APPWRITE_ENDPOINT ||
    "https://fra.cloud.appwrite.io/v1";
  const projectId =
    process.env.APPWRITE_PROJECT_ID ||
    process.env.VITE_APPWRITE_PROJECT_ID ||
    "6a9d0a3c0016b6eb0753";
  const databaseId =
    process.env.APPWRITE_DATABASE_ID ||
    process.env.VITE_APPWRITE_DATABASE_ID ||
    "6a9d0bb90033cb018bb0";
  const apiKey = process.env.APPWRITE_API_KEY || "";

  if (!apiKey && !jwt) {
    res.status(401).json({
      error: "Authentication required to update summary rows.",
    });
    return;
  }

  try {
    const results = await summarizeVideosInNode({
      videos,
      geminiKey,
      geminiModel: process.env.GEMINI_MODEL || "gemini-3.6-flash",
      endpoint,
      projectId,
      databaseId,
      videosTableId:
        process.env.APPWRITE_VIDEOS_COLLECTION_ID ||
        process.env.VITE_APPWRITE_VIDEOS_COLLECTION_ID ||
        "videos",
      apiKey,
      jwt,
    });
    res.status(200).json({ mode: "instant", results });
  } catch (err) {
    res.status(500).json({
      error: err?.message || "Instant summary generation failed.",
    });
  }
}
