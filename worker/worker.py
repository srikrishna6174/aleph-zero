"""
YouTube Channel Tracker — Background Worker
=============================================
Main orchestrator script. Designed to run every hour via cron or on demand.

Flow:
  1. Query tracked channels from Appwrite (resolving missing names/avatars)
  2. Fetch recent RSS uploads (or initial backfill for brand-new channels)
  3. Include queued 'pending' videos (e.g. from UI Retry button) and optionally 'failed' (--retry-failed)
  4. Deduplicate against already completed / actively processing videos
  5. For each candidate video:
     a. Create or reuse document in Appwrite, mark 'processing'
     b. Fetch transcript (youtube-transcript-api -> yt-dlp fallback)
     c. Summarize via Gemini API (transcript or title+description metadata fallback)
     d. Save summary or mark failed with diagnostic message
"""

import argparse
from datetime import datetime, timezone
import io
import logging
import sys
import time
from typing import Optional

# Force UTF-8 output on Windows to avoid emoji/unicode logging errors
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

from config import get_appwrite_config, get_gemini_config, get_worker_config
from appwrite_client import AppwriteClient
from rss_fetcher import (
    fetch_recent_videos,
    fetch_video_metadata_from_watch,
    get_channel_metadata,
    VideoEntry,
)
from transcript_fetcher import fetch_transcript, TranscriptFetchError
from summarizer import Summarizer

# ─── Logging Setup ───────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("worker")


def _row_to_video_entry(row: dict) -> Optional[VideoEntry]:
    """Convert an Appwrite video row dict into a VideoEntry."""
    vid = row.get("video_id", "")
    cid = row.get("channel_id", "")
    if not vid or not cid:
        return None
    return VideoEntry(
        video_id=vid,
        channel_id=cid,
        title=row.get("title", "Untitled"),
        published_at=row.get("published_at", datetime.now(timezone.utc).isoformat()),
        thumbnail_url=row.get("thumbnail_url", f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg"),
        description="",
    )


# ─── Main Worker ─────────────────────────────────────────────────────────────

def run_worker(
    retry_failed: bool = False,
    channel_id_filter: Optional[str] = None,
    backfill_override: Optional[int] = None,
    lookback_override: Optional[int] = None,
    limit: Optional[int] = None,
):
    """Execute one full cycle of the background worker."""
    start_time = time.time()
    logger.info("=" * 60)
    logger.info(f"Worker started at {datetime.now(timezone.utc).isoformat()}")
    logger.info("=" * 60)

    try:
        aw_config = get_appwrite_config()
        gemini_config = get_gemini_config()
        worker_config = get_worker_config()
    except EnvironmentError as e:
        logger.critical(f"Configuration error: {e}")
        sys.exit(1)

    lookback_minutes = (
        lookback_override if lookback_override is not None else worker_config.rss_lookback_minutes
    )
    backfill_count = (
        backfill_override if backfill_override is not None else worker_config.initial_backfill_count
    )

    aw_client = AppwriteClient(aw_config)
    summarizer = Summarizer(gemini_config)

    # Step 1: Get tracked channels
    try:
        channels = aw_client.get_all_channels(channel_id=channel_id_filter)
    except Exception as e:
        logger.critical(f"Failed to fetch channels: {e}")
        sys.exit(1)

    if not channels:
        logger.info("No channels being tracked. Exiting.")
        return

    logger.info(f"Processing {len(channels)} tracked channel(s)")

    channel_ids = [ch.get("channel_id", "") for ch in channels if ch.get("channel_id")]
    empty_channels = aw_client.get_channels_without_videos(channel_ids) if backfill_count > 0 else set()
    if empty_channels:
        logger.info(f"{len(empty_channels)} channel(s) have no videos yet — will backfill up to {backfill_count} recent videos each")

    # Step 2: Fetch RSS feeds and collect video candidates (keyed by video_id)
    candidates_by_id: dict[str, VideoEntry] = {}

    for channel in channels:
        channel_id = channel.get("channel_id", "")
        rss_url = channel.get("rss_url", "")
        channel_name = channel.get("name", channel_id)
        channel_thumb = channel.get("thumbnail_url", "")

        if not channel_id or not rss_url:
            logger.warning(f"Skipping channel with missing data: {channel}")
            continue

        # Auto-resolve missing/raw channel name or missing avatar thumbnail
        needs_name = (
            not channel_name
            or channel_name == channel_id
            or channel_name == "Unknown Channel"
        )
        needs_thumb = not channel_thumb
        if needs_name or needs_thumb:
            resolved_title, resolved_thumb = get_channel_metadata(channel_id, rss_url)
            new_name = resolved_title if (needs_name and resolved_title) else ""
            new_thumb = resolved_thumb if (needs_thumb and resolved_thumb) else ""
            if new_name or new_thumb:
                if new_name:
                    channel_name = new_name
                aw_client.update_channel_metadata(
                    channel_id, name=new_name, thumbnail_url=new_thumb
                )

        try:
            if channel_id in empty_channels:
                recent = fetch_recent_videos(
                    channel_id=channel_id,
                    rss_url=rss_url,
                    lookback_minutes=None,
                    max_videos=backfill_count,
                )
            else:
                recent = fetch_recent_videos(
                    channel_id=channel_id,
                    rss_url=rss_url,
                    lookback_minutes=lookback_minutes,
                )

            if recent:
                logger.info(
                    f"Channel '{channel_name}': {len(recent)} candidate video(s) from RSS"
                )
                for entry in recent:
                    candidates_by_id[entry.video_id] = entry
            else:
                logger.debug(f"Channel '{channel_name}': no new videos in RSS window")
        except Exception as e:
            logger.error(f"Error fetching RSS for channel '{channel_name}': {e}")
            continue

    # Step 2b: Always pick up queued 'pending' videos from DB (e.g., UI Retry actions)
    # and optionally 'failed' videos if --retry-failed is requested
    retry_statuses = ["pending", "failed"] if retry_failed else ["pending"]
    try:
        db_queued = aw_client.get_videos_by_status(
            retry_statuses, channel_id=channel_id_filter
        )
        if db_queued:
            logger.info(
                f"Found {len(db_queued)} video(s) in DB with status in {retry_statuses}"
            )
        for row in db_queued:
            vid = row.get("video_id")
            if vid and vid not in candidates_by_id:
                entry = _row_to_video_entry(row)
                if entry:
                    candidates_by_id[vid] = entry
    except Exception as e:
        logger.error(f"Error querying pending/failed videos: {e}")

    all_new_videos = list(candidates_by_id.values())
    if not all_new_videos:
        elapsed = time.time() - start_time
        logger.info(f"No new or queued videos found. Done in {elapsed:.1f}s")
        return

    logger.info(f"Total candidate videos before deduplication: {len(all_new_videos)}")

    # Step 3: Deduplicate against completed / actively processing videos in Appwrite
    candidate_ids = [v.video_id for v in all_new_videos]
    try:
        existing_ids = aw_client.get_existing_video_ids(candidate_ids)
    except Exception as e:
        logger.error(f"Failed to check existing videos: {e}")
        existing_ids = set()

    new_videos = [v for v in all_new_videos if v.video_id not in existing_ids]
    skipped_count = len(all_new_videos) - len(new_videos)

    if skipped_count > 0:
        logger.info(f"Skipping {skipped_count} already-completed/active video(s)")

    if not new_videos:
        elapsed = time.time() - start_time
        logger.info(f"All candidate videos are already processed. Done in {elapsed:.1f}s")
        return

    # Sort newest first
    new_videos.sort(key=lambda v: v.published_at, reverse=True)
    if limit is not None and limit > 0:
        new_videos = new_videos[:limit]

    logger.info(f"Processing {len(new_videos)} video(s)")

    # Step 4: Process each video
    success_count = 0
    fail_count = 0

    for idx, video in enumerate(new_videos, 1):
        logger.info(f"\n{'─' * 50}")
        logger.info(f"[{idx}/{len(new_videos)}] Processing: {video.title} ({video.video_id})")
        logger.info(f"{'─' * 50}")

        existing_retryable_id = aw_client.get_retryable_video_doc_id(video.video_id)

        if existing_retryable_id:
            document_id = existing_retryable_id
            logger.info(
                f"Using existing pending/retryable row for {video.video_id} (doc: {document_id})"
            )
        else:
            try:
                doc = aw_client.create_video_document(
                    video_id=video.video_id,
                    channel_id=video.channel_id,
                    title=video.title,
                    published_at=video.published_at,
                    thumbnail_url=video.thumbnail_url,
                    status="pending",
                )
            except Exception as e:
                logger.error(f"Failed to create document for {video.video_id}: {e}")
                fail_count += 1
                continue

            if doc is None:
                logger.info(f"Video {video.video_id} already exists, skipping")
                continue

            document_id = doc["$id"]

        try:
            aw_client.mark_video_processing(document_id)
        except Exception as e:
            logger.warning(f"Failed to mark {video.video_id} as processing: {e}")

        # 4b. Fetch transcript
        transcript_result = None
        try:
            transcript_result = fetch_transcript(
                video_id=video.video_id,
                chunk_size=worker_config.transcript_chunk_size,
            )
        except TranscriptFetchError as e:
            logger.warning(
                f"All transcript layers failed for {video.video_id}: {e}\n"
                f"-> Falling back to metadata-only AI summary."
            )
        except Exception as e:
            logger.error(f"Unexpected transcript error for {video.video_id}: {e}")

        # 4c. Summarize via Gemini (transcript or metadata fallback)
        try:
            if transcript_result is not None:
                summary = summarizer.summarize(
                    chunks=transcript_result.chunks,
                    video_title=video.title,
                    max_retries=worker_config.max_retries,
                    retry_delay=worker_config.retry_delay_seconds,
                )
                lang_info = transcript_result.language
                translated_info = transcript_result.was_translated
                source_info = transcript_result.source
            else:
                description = video.description
                title_for_meta = video.title
                if not description:
                    fetched_title, fetched_desc = fetch_video_metadata_from_watch(video.video_id)
                    if fetched_desc:
                        description = fetched_desc
                    if fetched_title and (not title_for_meta or title_for_meta == "Untitled"):
                        title_for_meta = fetched_title

                summary = summarizer.summarize_from_metadata(
                    video_title=title_for_meta,
                    description=description,
                    max_retries=worker_config.max_retries,
                    retry_delay=worker_config.retry_delay_seconds,
                )
                lang_info = "metadata-only"
                translated_info = False
                source_info = "metadata-fallback"
                logger.info(
                    f"[Metadata Fallback] Generated summary for {video.video_id} "
                    f"(desc_len={len(description)})"
                )
        except Exception as e:
            error_msg = f"Summarization failed: {e}"
            logger.error(error_msg)
            try:
                aw_client.mark_video_failed(document_id, error_msg)
            except Exception:
                pass
            fail_count += 1
            continue

        # 4d. Save summary
        try:
            aw_client.update_video_summary(document_id, summary)
            success_count += 1
            logger.info(
                f"[OK] Summarized {video.video_id} "
                f"({len(summary)} chars, lang={lang_info}, "
                f"translated={translated_info}, source={source_info})"
            )
        except Exception as e:
            logger.error(
                f"Unexpected error saving summary for {video.video_id}: {e}",
                exc_info=True,
            )
            try:
                aw_client.update_video_status(
                    document_id, "failed", error_message=f"Unexpected error: {str(e)}"
                )
            except Exception:
                pass
            fail_count += 1

        if idx < len(new_videos):
            logger.info("Waiting 3s before next video to respect API rate limits...")
            time.sleep(3)

    elapsed = time.time() - start_time
    logger.info("\n" + "=" * 60)
    logger.info(f"Worker completed in {elapsed:.1f}s")
    logger.info(f"  Channels scanned:        {len(channels)}")
    logger.info(f"  Videos processed:        {len(new_videos)}")
    logger.info(f"  Successfully summarized: {success_count}")
    logger.info(f"  Failed:                  {fail_count}")
    logger.info("=" * 60)


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="TubeDigest YouTube Summarizer Worker")
    parser.add_argument(
        "--retry-failed",
        action="store_true",
        help="Also reprocess previously failed video documents in Appwrite",
    )
    parser.add_argument(
        "--channel",
        type=str,
        default=None,
        help="Only process a specific YouTube channel_id",
    )
    parser.add_argument(
        "--backfill",
        type=int,
        default=None,
        help="Override initial backfill video count for channels with no videos",
    )
    parser.add_argument(
        "--lookback",
        type=int,
        default=None,
        help="Override RSS lookback window in minutes",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Max number of videos to process in this run",
    )
    return parser.parse_args()


if __name__ == "__main__":
    try:
        args = _parse_args()
        run_worker(
            retry_failed=args.retry_failed,
            channel_id_filter=args.channel,
            backfill_override=args.backfill,
            lookback_override=args.lookback,
            limit=args.limit,
        )
    except KeyboardInterrupt:
        logger.info("Worker interrupted by user")
        sys.exit(0)
    except Exception as e:
        logger.critical(f"Worker crashed with unhandled exception: {e}", exc_info=True)
        sys.exit(1)
