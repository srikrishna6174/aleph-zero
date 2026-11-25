import { resolveYouTubeChannel } from "../server/youtubeResolver.js";

export default async function handler(req, res) {
  const input = typeof req.query?.input === "string" ? req.query.input : "";
  if (!input.trim()) {
    res.status(400).json({ error: "Missing 'input' query parameter." });
    return;
  }

  try {
    const resolved = await resolveYouTubeChannel(input);
    res.status(200).json(resolved);
  } catch (err) {
    res.status(422).json({
      error: err?.message || "Failed to resolve YouTube channel.",
    });
  }
}
