"""
Appwrite TablesDB Client Wrapper (SDK v24+)
=============================================
Provides typed, reusable methods for interacting with the
YouTube Tracker Appwrite tables using the new TablesDB API.
"""

from datetime import datetime, timezone, timedelta
import logging
from typing import Optional

from appwrite.client import Client
from appwrite.services.tables_db import TablesDB
from appwrite.query import Query
from appwrite.id import ID
from appwrite.exception import AppwriteException

from config import AppwriteConfig

logger = logging.getLogger(__name__)


def _extract_rows(response) -> list:
    """Safely extract rows list from an Appwrite response object or dict."""
    if hasattr(response, "rows"):
        return response.rows or []
    return response.get("rows", response.get("documents", [])) or []


def _row_to_dict(row) -> dict:
    """Convert an Appwrite Pydantic Row or dict into a unified dict with $id and timestamps."""
    if hasattr(row, "data") and isinstance(row.data, dict):
        d = {
            "$id": getattr(row, "id", None),
            "$updatedAt": getattr(row, "updatedat", None) or getattr(row, "updated_at", None),
            "$createdAt": getattr(row, "createdat", None) or getattr(row, "created_at", None),
            **row.data,
        }
        return d
    if isinstance(row, dict):
        return row
    return dict(row)


def _is_stale_processing(updated_at_str: Optional[str], hours: int = 2) -> bool:
    """Check if a 'processing' row has been stuck for longer than `hours`."""
    if not updated_at_str:
        return False
    try:
        clean_date = updated_at_str.replace("Z", "+00:00")
        updated_at = datetime.fromisoformat(clean_date)
        return datetime.now(timezone.utc) - updated_at > timedelta(hours=hours)
    except Exception:
        return False


class AppwriteClient:
    """Wrapper around Appwrite TablesDB service for YouTube Tracker operations."""

    def __init__(self, config: AppwriteConfig):
        self._config = config
        self._client = Client()
        self._client.set_endpoint(config.endpoint)
        self._client.set_project(config.project_id)
        self._client.set_key(config.api_key)
        self._db = TablesDB(self._client)

    # --- Channel Operations ---------------------------------------------------

    def get_all_channels(self, channel_id: Optional[str] = None) -> list[dict]:
        """Retrieve tracked channels from the database (optionally filtered by channel_id)."""
        channels = []
        last_id = None

        while True:
            queries = [Query.limit(100)]
            if channel_id:
                queries.append(Query.equal("channel_id", [channel_id]))
            if last_id:
                queries.append(Query.cursor_after(last_id))

            response = self._db.list_rows(
                database_id=self._config.database_id,
                table_id=self._config.channels_collection_id,
                queries=queries,
            )

            docs = _extract_rows(response)
            if not docs:
                break

            for doc in docs:
                channels.append(_row_to_dict(doc))

            last_id = channels[-1].get("$id")
            if len(docs) < 100:
                break

        logger.info(f"Fetched {len(channels)} channel(s) from Appwrite")
        return channels

    def get_channels_without_videos(self, channel_ids: list[str]) -> set[str]:
        """Return the subset of `channel_ids` that currently have zero rows in the videos table."""
        empty_channels: set[str] = set()
        for cid in channel_ids:
            try:
                response = self._db.list_rows(
                    database_id=self._config.database_id,
                    table_id=self._config.videos_collection_id,
                    queries=[
                        Query.equal("channel_id", [cid]),
                        Query.select(["video_id"]),
                        Query.limit(1),
                    ],
                )
                if not _extract_rows(response):
                    empty_channels.add(cid)
            except AppwriteException as e:
                logger.warning(f"Could not check video count for channel {cid}: {e.message}")
        return empty_channels

    # --- Video Operations -----------------------------------------------------

    def get_existing_video_ids(self, video_ids: list[str]) -> set[str]:
        """
        Check which video IDs already exist and are completed or actively processing.
        'pending', 'failed', and stale 'processing' (>2h) videos are NOT included
        so they remain eligible for processing/retry.
        """
        existing: set[str] = set()
        batch_size = 100

        for i in range(0, len(video_ids), batch_size):
            batch = video_ids[i : i + batch_size]
            try:
                response = self._db.list_rows(
                    database_id=self._config.database_id,
                    table_id=self._config.videos_collection_id,
                    queries=[
                        Query.equal("video_id", batch),
                        Query.select(["video_id", "status", "$updatedAt"]),
                        Query.limit(batch_size),
                    ],
                )
                for row in _extract_rows(response):
                    d = _row_to_dict(row)
                    vid = d.get("video_id")
                    status = d.get("status")
                    updated_at_str = d.get("$updatedAt")

                    if not vid:
                        continue

                    if status == "completed":
                        existing.add(vid)
                    elif status == "processing" and not _is_stale_processing(updated_at_str):
                        existing.add(vid)
                    # Note: 'pending' and 'failed' are intentionally NOT added to `existing`
            except AppwriteException as e:
                logger.error(f"Error checking existing videos: {e.message}")
                raise

        return existing

    def get_videos_by_status(
        self,
        statuses: list[str],
        channel_id: Optional[str] = None,
    ) -> list[dict]:
        """Fetch all video rows matching any status in `statuses`."""
        videos: list[dict] = []
        last_id = None

        while True:
            queries = [
                Query.equal("status", statuses),
                Query.order_desc("published_at"),
                Query.limit(100),
            ]
            if channel_id:
                queries.append(Query.equal("channel_id", [channel_id]))
            if last_id:
                queries.append(Query.cursor_after(last_id))

            response = self._db.list_rows(
                database_id=self._config.database_id,
                table_id=self._config.videos_collection_id,
                queries=queries,
            )
            docs = _extract_rows(response)
            if not docs:
                break

            for doc in docs:
                videos.append(_row_to_dict(doc))

            last_id = videos[-1].get("$id")
            if len(docs) < 100:
                break

        return videos

    def get_videos_by_video_ids(self, video_ids: list[str]) -> list[dict]:
        """Fetch video rows matching any video_id in `video_ids`."""
        if not video_ids:
            return []
        videos: list[dict] = []
        batch_size = 100
        for i in range(0, len(video_ids), batch_size):
            batch = video_ids[i : i + batch_size]
            response = self._db.list_rows(
                database_id=self._config.database_id,
                table_id=self._config.videos_collection_id,
                queries=[Query.equal("video_id", batch), Query.limit(batch_size)],
            )
            for doc in _extract_rows(response):
                videos.append(_row_to_dict(doc))
        return videos

    def get_retryable_video_doc_id(self, video_id: str) -> Optional[str]:
        """
        Look up a video row by video_id and return its document $id if it is
        'pending', 'failed', or stuck in 'processing' for over 2 hours.
        """
        try:
            response = self._db.list_rows(
                database_id=self._config.database_id,
                table_id=self._config.videos_collection_id,
                queries=[
                    Query.equal("video_id", [video_id]),
                    Query.limit(1),
                ],
            )
            rows = _extract_rows(response)
            if rows:
                d = _row_to_dict(rows[0])
                status = d.get("status")
                doc_id = d.get("$id")
                updated_at_str = d.get("$updatedAt")

                if status in ("pending", "failed"):
                    return doc_id

                if status == "processing" and _is_stale_processing(updated_at_str):
                    return doc_id
        except AppwriteException as e:
            logger.warning(f"Error looking up retryable video {video_id}: {e.message}")
        return None

    def create_video_document(
        self,
        video_id: str,
        channel_id: str,
        title: str,
        published_at: str,
        thumbnail_url: str = "",
        status: str = "pending",
    ) -> Optional[dict]:
        """
        Create a new video row in the database.
        Returns the created row dict, or None if it already exists (409).
        """
        try:
            row = self._db.create_row(
                database_id=self._config.database_id,
                table_id=self._config.videos_collection_id,
                row_id=ID.unique(),
                data={
                    "video_id": video_id,
                    "channel_id": channel_id,
                    "title": title[:510],
                    "published_at": published_at,
                    "thumbnail_url": thumbnail_url[:510],
                    "ai_summary": "",
                    "status": status,
                    "error_message": "",
                },
            )
            doc_id = row.id if hasattr(row, "id") else row.get("$id")
            logger.info(f"Created video row for {video_id}")
            return {"$id": doc_id, "video_id": video_id}
        except AppwriteException as e:
            if e.code == 409:
                logger.warning(f"Video {video_id} already exists, skipping creation")
                return None
            logger.error(f"Error creating video row for {video_id}: {e.message}")
            raise

    def update_video_summary(self, document_id: str, summary: str) -> dict:
        """Update a video row with the AI-generated summary."""
        self._db.update_row(
            database_id=self._config.database_id,
            table_id=self._config.videos_collection_id,
            row_id=document_id,
            data={
                "ai_summary": summary,
                "status": "completed",
                "error_message": "",
            },
        )
        logger.info(f"Updated video {document_id} with summary")
        return {"$id": document_id}

    def mark_video_failed(self, document_id: str, error_message: str) -> dict:
        """Mark a video row as failed with an error message."""
        truncated_error = error_message[:1020] if len(error_message) > 1020 else error_message
        self._db.update_row(
            database_id=self._config.database_id,
            table_id=self._config.videos_collection_id,
            row_id=document_id,
            data={
                "status": "failed",
                "error_message": truncated_error,
            },
        )
        logger.warning(f"Marked video {document_id} as failed: {truncated_error[:100]}")
        return {"$id": document_id}

    def mark_video_processing(self, document_id: str) -> dict:
        """Mark a video row as currently being processed."""
        self._db.update_row(
            database_id=self._config.database_id,
            table_id=self._config.videos_collection_id,
            row_id=document_id,
            data={"status": "processing", "error_message": ""},
        )
        return {"$id": document_id}

    def update_video_status(
        self, document_id: str, status: str, error_message: str = ""
    ) -> dict:
        """Update a video row's status (and optionally error message)."""
        data: dict = {"status": status}
        if error_message:
            truncated = error_message[:1020] if len(error_message) > 1020 else error_message
            data["error_message"] = truncated
        self._db.update_row(
            database_id=self._config.database_id,
            table_id=self._config.videos_collection_id,
            row_id=document_id,
            data=data,
        )
        logger.info(f"Updated video {document_id} status to '{status}'")
        return {"$id": document_id}

    def update_channel_metadata(
        self, channel_id: str, name: str = "", thumbnail_url: str = ""
    ) -> dict:
        """Update a channel row's name and/or thumbnail_url."""
        try:
            response = self._db.list_rows(
                database_id=self._config.database_id,
                table_id=self._config.channels_collection_id,
                queries=[Query.equal("channel_id", [channel_id]), Query.limit(1)],
            )
            rows = _extract_rows(response)
            if rows:
                d = _row_to_dict(rows[0])
                doc_id = d.get("$id")
                data = {}
                if name:
                    data["name"] = name[:255]
                if thumbnail_url:
                    data["thumbnail_url"] = thumbnail_url[:510]
                if data and doc_id:
                    self._db.update_row(
                        database_id=self._config.database_id,
                        table_id=self._config.channels_collection_id,
                        row_id=doc_id,
                        data=data,
                    )
                    logger.info(f"Updated channel metadata for {channel_id}: {list(data.keys())}")
                return {"$id": doc_id}
        except Exception as e:
            logger.warning(f"Could not update channel metadata for {channel_id}: {e}")
        return {}
