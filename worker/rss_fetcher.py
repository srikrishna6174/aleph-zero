"""
YouTube RSS Feed Fetcher
=========================
Parses YouTube channel RSS feeds and filters for recently published videos.
Automatically skips YouTube Shorts — only processes regular videos and live streams.
"""

import logging
from datetime import datetime, timezone, timedelta
from dataclasses import dataclass

import feedparser
import requests

logger = logging.getLogger(__name__)

RSS_BASE_URL = "https://www.youtube.com/feeds/videos.xml?channel_id="

# Timeout for Shorts detection HTTP requests (seconds)
SHORTS_CHECK_TIMEOUT = 5


@dataclass
class VideoEntry:
    """Represents a video discovered from an RSS feed."""
    video_id: str
    channel_id: str
    title: str
    published_at: str       # ISO 8601 string
    thumbnail_url: str


def build_rss_url(channel_id: str) -> str:
    """Construct the YouTube RSS feed URL for a given channel ID."""
    return f"{RSS_BASE_URL}{channel_id}"


def is_youtube_short(video_id: str) -> bool:
    """
    Detect whether a video is a YouTube Short.

    Method: Send a HEAD request to https://www.youtube.com/shorts/{video_id}.
    - If the URL resolves without redirecting, it's a Short.
    - If it redirects to /watch?v=..., it's a regular video.

    Returns True if the video is a Short, False otherwise.
    """
    try:
        response = requests.head(
            f"https://www.youtube.com/shorts/{video_id}",
            allow_redirects=True,
            timeout=SHORTS_CHECK_TIMEOUT,
            headers={"User-Agent": "Mozilla/5.0"},
        )
        # After following redirects, check the final URL
        final_url = response.url
        is_short = "/shorts/" in final_url
        return is_short
    except Exception as e:
        logger.debug(f"Shorts check failed for {video_id}, assuming not a Short: {e}")
        return False


def fetch_recent_videos(
    channel_id: str,
    rss_url: str,
    lookback_minutes: int = 70,
) -> list[VideoEntry]:
    """
    Fetch and parse a YouTube channel's RSS feed.
    Returns videos published within the last `lookback_minutes`.
    Automatically filters out YouTube Shorts.

    Args:
        channel_id: The YouTube channel ID.
        rss_url: The RSS feed URL for the channel.
        lookback_minutes: How far back to look for new uploads (default 70 min
                          for a 10-min overlap buffer on hourly cron).

    Returns:
        List of VideoEntry objects for recently published regular videos/live streams.
    """
    logger.info(f"Fetching RSS feed for channel {channel_id}: {rss_url}")

    try:
        # Use requests to fetch the XML with a standard User-Agent
        # feedparser's default User-Agent is often blocked by YouTube
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        response = requests.get(rss_url, headers=headers, timeout=10)
        response.raise_for_status()
        
        feed = feedparser.parse(response.content)
    except Exception as e:
        logger.error(f"Failed to fetch or parse RSS feed for {channel_id}: {e}")
        return []

    if feed.bozo and not feed.entries:
        logger.warning(
            f"RSS feed for {channel_id} returned an error: {feed.bozo_exception}"
        )
        return []

    cutoff_time = datetime.now(timezone.utc) - timedelta(minutes=lookback_minutes)
    recent_videos: list[VideoEntry] = []
    shorts_skipped = 0

    for entry in feed.entries:
        try:
            # Parse the published date from the RSS entry
            published_str = entry.get("published", "")
            if not published_str:
                logger.debug(f"Skipping entry without published date: {entry.get('title', 'unknown')}")
                continue

            # feedparser normalizes dates into time.struct_time in `published_parsed`
            published_parsed = entry.get("published_parsed")
            if published_parsed:
                published_dt = datetime(
                    *published_parsed[:6], tzinfo=timezone.utc
                )
            else:
                # Fallback: try to parse the ISO string directly
                published_dt = datetime.fromisoformat(
                    published_str.replace("Z", "+00:00")
                )

            # Filter by recency
            if published_dt < cutoff_time:
                continue

            # Extract video ID from the entry
            # YouTube RSS uses `yt:videoId` which feedparser exposes as `yt_videoid`
            video_id = entry.get("yt_videoid", "")
            if not video_id:
                # Fallback: extract from link
                link = entry.get("link", "")
                if "watch?v=" in link:
                    video_id = link.split("watch?v=")[-1].split("&")[0]

            if not video_id:
                logger.warning(f"Could not extract video ID from entry: {entry.get('title', 'unknown')}")
                continue

            # Skip YouTube Shorts — only process regular videos and live streams
            if is_youtube_short(video_id):
                title = entry.get("title", "unknown")
                logger.info(f"Skipping YouTube Short: {title} ({video_id})")
                shorts_skipped += 1
                continue

            # Extract thumbnail URL
            thumbnail_url = ""
            media_group = entry.get("media_group", [])
            if media_group:
                # feedparser nests media:thumbnail under media:group
                thumbnails = entry.get("media_thumbnail", [])
                if thumbnails:
                    thumbnail_url = thumbnails[0].get("url", "")

            if not thumbnail_url:
                # Fallback: use standard YouTube thumbnail URL
                thumbnail_url = f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"

            recent_videos.append(
                VideoEntry(
                    video_id=video_id,
                    channel_id=channel_id,
                    title=entry.get("title", "Untitled"),
                    published_at=published_dt.isoformat(),
                    thumbnail_url=thumbnail_url,
                )
            )

        except Exception as e:
            logger.error(
                f"Error processing RSS entry for {channel_id}: {e}",
                exc_info=True,
            )
            continue

    logger.info(
        f"Found {len(recent_videos)} recent videos for channel {channel_id} "
        f"(cutoff: {cutoff_time.isoformat()}, shorts skipped: {shorts_skipped})"
    )
    return recent_videos

