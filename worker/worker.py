"""
YouTube Channel Tracker — Background Worker
=============================================
Main orchestrator script. Designed to run every hour via cron.

Flow:
  1. Query all tracked channels from Appwrite
  2. Fetch each channel's RSS feed for recent uploads
  3. Deduplicate against existing video documents
  4. For each new video:
     a. Create a 'pending' document in Appwrite
     b. Fetch the transcript (with English translation fallback)
     c. Summarize via Gemini API
     d. Update the document with the AI summary
  5. Handle errors gracefully and mark failed documents
"""

import logging
import sys
import time
from datetime import datetime, timezone

from config import get_appwrite_config, get_gemini_config, get_worker_config
from appwrite_client import AppwriteClient
from rss_fetcher import fetch_recent_videos, VideoEntry
from transcript_fetcher import fetch_transcript, TranscriptFetchError
from summarizer import Summarizer

# ─── Logging Setup ───────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger("worker")


# ─── Main Worker ─────────────────────────────────────────────────────────────

def run_worker():
    """Execute one full cycle of the background worker."""
    start_time = time.time()
    logger.info("=" * 60)
    logger.info(f"Worker started at {datetime.now(timezone.utc).isoformat()}")
    logger.info("=" * 60)

    # Load configuration
    try:
        aw_config = get_appwrite_config()
        gemini_config = get_gemini_config()
        worker_config = get_worker_config()
    except EnvironmentError as e:
        logger.critical(f"Configuration error: {e}")
        sys.exit(1)

    # Initialize clients
    aw_client = AppwriteClient(aw_config)
    summarizer = Summarizer(gemini_config)

    # Step 1: Get all tracked channels
    try:
        channels = aw_client.get_all_channels()
    except Exception as e:
        logger.critical(f"Failed to fetch channels: {e}")
        sys.exit(1)

    if not channels:
        logger.info("No channels being tracked. Exiting.")
        return

    logger.info(f"Processing {len(channels)} tracked channels")

    # Step 2: Fetch RSS feeds and collect new videos
    all_new_videos: list[VideoEntry] = []

    for channel in channels:
        channel_id = channel.get("channel_id", "")
        rss_url = channel.get("rss_url", "")
        channel_name = channel.get("name", channel_id)

        if not channel_id or not rss_url:
            logger.warning(f"Skipping channel with missing data: {channel}")
            continue

        try:
            recent = fetch_recent_videos(
                channel_id=channel_id,
                rss_url=rss_url,
                lookback_minutes=worker_config.rss_lookback_minutes,
            )
            if recent:
                logger.info(
                    f"Channel '{channel_name}': {len(recent)} new video(s) found"
                )
                all_new_videos.extend(recent)
            else:
                logger.debug(f"Channel '{channel_name}': no new videos")
        except Exception as e:
            logger.error(f"Error fetching RSS for channel '{channel_name}': {e}")
            continue

    if not all_new_videos:
        elapsed = time.time() - start_time
        logger.info(f"No new videos found across all channels. Done in {elapsed:.1f}s")
        return

    logger.info(f"Total new video candidates: {len(all_new_videos)}")

    # Step 3: Deduplicate against existing videos in Appwrite
    candidate_ids = [v.video_id for v in all_new_videos]
    try:
        existing_ids = aw_client.get_existing_video_ids(candidate_ids)
    except Exception as e:
        logger.error(f"Failed to check existing videos: {e}")
        existing_ids = set()

    new_videos = [v for v in all_new_videos if v.video_id not in existing_ids]
    skipped_count = len(all_new_videos) - len(new_videos)

    if skipped_count > 0:
        logger.info(f"Skipping {skipped_count} already-processed video(s)")

    if not new_videos:
        elapsed = time.time() - start_time
        logger.info(f"All videos already processed. Done in {elapsed:.1f}s")
        return

    logger.info(f"Processing {len(new_videos)} new video(s)")

    # Step 4: Process each new video
    success_count = 0
    fail_count = 0

    for video in new_videos:
        logger.info(f"\n{'─' * 50}")
        logger.info(f"Processing: {video.title} ({video.video_id})")
        logger.info(f"{'─' * 50}")

        # 4a. Create a pending document in Appwrite
        doc = None
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
            # Document already exists (409), skip
            logger.info(f"Video {video.video_id} already exists, skipping")
            continue

        document_id = doc["$id"]

        # Mark as processing
        try:
            aw_client.mark_video_processing(document_id)
        except Exception as e:
            logger.warning(f"Failed to mark {video.video_id} as processing: {e}")

        # 4b. Fetch transcript
        try:
            transcript_result = fetch_transcript(
                video_id=video.video_id,
                chunk_size=worker_config.transcript_chunk_size,
            )
        except TranscriptFetchError as e:
            error_msg = str(e)
            logger.warning(f"Transcript unavailable for {video.video_id}: {error_msg}")
            try:
                aw_client.mark_video_failed(document_id, f"Transcript: {error_msg}")
            except Exception:
                pass
            fail_count += 1
            continue
        except Exception as e:
            error_msg = f"Unexpected transcript error: {e}"
            logger.error(error_msg)
            try:
                aw_client.mark_video_failed(document_id, error_msg)
            except Exception:
                pass
            fail_count += 1
            continue

        # 4c. Summarize via Gemini
        try:
            summary = summarizer.summarize(
                chunks=transcript_result.chunks,
                video_title=video.title,
                max_retries=worker_config.max_retries,
                retry_delay=worker_config.retry_delay_seconds,
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

        # 4d. Update document with the summary
        try:
            aw_client.update_video_summary(document_id, summary)
            success_count += 1
            logger.info(
                f"✅ Successfully summarized {video.video_id} "
                f"({len(summary)} chars, "
                f"lang={transcript_result.language}, "
                f"translated={transcript_result.was_translated})"
            )
        except Exception as e:
            logger.error(f"Failed to save summary for {video.video_id}: {e}")
            fail_count += 1
            continue

    # ─── Summary ─────────────────────────────────────────────────────────

    elapsed = time.time() - start_time
    logger.info("\n" + "=" * 60)
    logger.info(f"Worker completed in {elapsed:.1f}s")
    logger.info(f"  Channels scanned:  {len(channels)}")
    logger.info(f"  New videos found:  {len(new_videos)}")
    logger.info(f"  Successfully summarized: {success_count}")
    logger.info(f"  Failed: {fail_count}")
    logger.info("=" * 60)


# ─── Entry Point ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    try:
        run_worker()
    except KeyboardInterrupt:
        logger.info("Worker interrupted by user")
        sys.exit(0)
    except Exception as e:
        logger.critical(f"Worker crashed with unhandled exception: {e}", exc_info=True)
        sys.exit(1)
