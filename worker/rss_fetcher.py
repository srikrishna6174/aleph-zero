"""
YouTube RSS Feed Fetcher
=========================
Parses YouTube channel RSS feeds and filters for recently published videos.
Automatically skips YouTube Shorts — only processes regular videos and live streams.
"""

import html as html_lib
import json
import logging
import re
from datetime import datetime, timezone, timedelta
from dataclasses import dataclass
from typing import Optional

import feedparser
import requests

logger = logging.getLogger(__name__)

RSS_BASE_URL = "https://www.youtube.com/feeds/videos.xml?channel_id="

# Timeout for Shorts detection and metadata HTTP requests (seconds)
SHORTS_CHECK_TIMEOUT = 5

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}


@dataclass
class VideoEntry:
    """Represents a video discovered from an RSS feed."""
    video_id: str
    channel_id: str
    title: str
    published_at: str       # ISO 8601 string
    thumbnail_url: str
    description: str = ""


def build_rss_url(channel_id: str) -> str:
    """Construct the YouTube RSS feed URL for a given channel ID."""
    return f"{RSS_BASE_URL}{channel_id}"


def get_channel_title_from_feed(rss_url: str) -> str:
    """Extract real channel title from YouTube RSS feed."""
    try:
        response = requests.get(rss_url, headers=DEFAULT_HEADERS, timeout=10)
        if response.ok:
            feed = feedparser.parse(response.content)
            title = feed.feed.get("title")
            if title:
                return title.strip()
    except Exception:
        pass
    return ""


def get_channel_metadata(channel_id: str, rss_url: str = "") -> tuple[str, str]:
    """
    Resolve the real channel title and avatar thumbnail URL from RSS / YouTube page.
    Returns (title, thumbnail_url).
    """
    title = ""
    thumbnail_url = ""

    if rss_url:
        title = get_channel_title_from_feed(rss_url)

    try:
        resp = requests.get(
            f"https://www.youtube.com/channel/{channel_id}",
            headers=DEFAULT_HEADERS,
            timeout=10,
        )
        if resp.ok:
            html = resp.text
            if not title:
                m_title = re.search(
                    r'<meta property="og:title" content="([^"]+)"', html
                )
                if m_title:
                    title = m_title.group(1).strip()
            m_img = re.search(
                r'<meta property="og:image" content="([^"]+)"', html
            )
            if m_img:
                thumbnail_url = m_img.group(1).strip()
    except Exception as e:
        logger.debug(f"Could not fetch channel page metadata for {channel_id}: {e}")

    return title, thumbnail_url


def is_youtube_short(video_id: str, link: str = "") -> bool:
    """
    Detect whether a video is a YouTube Short.

    Fast-path: if the RSS link already contains '/shorts/', return True.
    Otherwise, send a HEAD request to https://www.youtube.com/shorts/{video_id}.
    - If the URL resolves without redirecting away from /shorts/, it's a Short.
    - If it redirects to /watch?v=..., it's a regular video.
    """
    if link and "/shorts/" in link:
        return True

    try:
        response = requests.head(
            f"https://www.youtube.com/shorts/{video_id}",
            allow_redirects=True,
            timeout=SHORTS_CHECK_TIMEOUT,
            headers={"User-Agent": DEFAULT_HEADERS["User-Agent"]},
        )
        return "/shorts/" in response.url
    except Exception as e:
        logger.debug(f"Shorts check failed for {video_id}, assuming not a Short: {e}")
        return False


def _clean_description(raw_desc: str) -> str:
    """Normalize an RSS summary/description string."""
    if not raw_desc:
        return ""
    # Strip any HTML tags just in case and collapse excessive blank lines
    text = re.sub(r"<[^>]+>", " ", raw_desc)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()[:4000]


def fetch_video_metadata_from_watch(video_id: str) -> tuple[str, str]:
    """
    Fetch (title, description) for a single video via YouTube watch page / oEmbed.
    Useful when retrying older videos not present in the 15-item RSS feed.
    """
    title = ""
    description = ""
    try:
        resp = requests.get(
            f"https://www.youtube.com/watch?v={video_id}",
            headers=DEFAULT_HEADERS,
            timeout=10,
        )
        if resp.ok:
            page_html = resp.text
            m_title = re.search(
                r'<meta name="title" content="([^"]+)"', page_html
            ) or re.search(r'<meta property="og:title" content="([^"]+)"', page_html)
            if m_title:
                title = html_lib.unescape(m_title.group(1).strip())

            m_desc = re.search(
                r'"shortDescription":"((?:[^"\\]|\\.)*)"', page_html
            )
            if m_desc:
                try:
                    description = json.loads(f'"{m_desc.group(1)}"')
                except Exception:
                    description = m_desc.group(1)
    except Exception as e:
        logger.debug(f"Could not fetch watch metadata for {video_id}: {e}")

    return title, _clean_description(description)


def fetch_recent_videos(
    channel_id: str,
    rss_url: str,
    lookback_minutes: Optional[int] = 70,
    max_videos: Optional[int] = None,
) -> list[VideoEntry]:
    """
    Fetch and parse a YouTube channel's RSS feed.
    If `lookback_minutes` is provided, filters to videos published within that window.
    If `lookback_minutes` is None, considers all entries in the RSS feed (up to `max_videos`).
    Automatically filters out YouTube Shorts.
    """
    logger.info(f"Fetching RSS feed for channel {channel_id}: {rss_url}")

    try:
        response = requests.get(rss_url, headers=DEFAULT_HEADERS, timeout=10)
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

    cutoff_time = (
        datetime.now(timezone.utc) - timedelta(minutes=lookback_minutes)
        if lookback_minutes is not None
        else None
    )
    recent_videos: list[VideoEntry] = []
    shorts_skipped = 0

    for entry in feed.entries:
        if max_videos is not None and len(recent_videos) >= max_videos:
            break

        try:
            published_str = entry.get("published", "")
            if not published_str:
                logger.debug(
                    f"Skipping entry without published date: {entry.get('title', 'unknown')}"
                )
                continue

            published_parsed = entry.get("published_parsed")
            if published_parsed:
                published_dt = datetime(
                    *published_parsed[:6], tzinfo=timezone.utc
                )
            else:
                published_dt = datetime.fromisoformat(
                    published_str.replace("Z", "+00:00")
                )

            if cutoff_time is not None and published_dt < cutoff_time:
                continue

            link = entry.get("link", "")
            video_id = entry.get("yt_videoid", "")
            if not video_id and "watch?v=" in link:
                video_id = link.split("watch?v=")[-1].split("&")[0]
            if not video_id and "/shorts/" in link:
                video_id = link.split("/shorts/")[-1].split("?")[0]

            if not video_id:
                logger.warning(
                    f"Could not extract video ID from entry: {entry.get('title', 'unknown')}"
                )
                continue

            if is_youtube_short(video_id, link=link):
                title = entry.get("title", "unknown")
                logger.info(f"Skipping YouTube Short: {title} ({video_id})")
                shorts_skipped += 1
                continue

            thumbnail_url = ""
            thumbnails = entry.get("media_thumbnail", [])
            if thumbnails and isinstance(thumbnails, list):
                thumbnail_url = thumbnails[0].get("url", "")

            if not thumbnail_url:
                thumbnail_url = f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"

            description = _clean_description(
                entry.get("summary") or entry.get("description") or ""
            )

            recent_videos.append(
                VideoEntry(
                    video_id=video_id,
                    channel_id=channel_id,
                    title=entry.get("title", "Untitled"),
                    published_at=published_dt.isoformat(),
                    thumbnail_url=thumbnail_url,
                    description=description,
                )
            )

        except Exception as e:
            logger.error(
                f"Error processing RSS entry for {channel_id}: {e}",
                exc_info=True,
            )
            continue

    cutoff_desc = cutoff_time.isoformat() if cutoff_time else "all"
    logger.info(
        f"Found {len(recent_videos)} video(s) for channel {channel_id} "
        f"(cutoff: {cutoff_desc}, shorts skipped: {shorts_skipped})"
    )
    return recent_videos
