"""
Appwrite TablesDB Client Wrapper (SDK v24+)
=============================================
Provides typed, reusable methods for interacting with the
YouTube Tracker Appwrite tables using the new TablesDB API.
"""

import logging
from typing import Optional

from appwrite.client import Client
from appwrite.services.tables_db import TablesDB
from appwrite.query import Query
from appwrite.id import ID
from appwrite.exception import AppwriteException

from config import AppwriteConfig

logger = logging.getLogger(__name__)


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

    def get_all_channels(self) -> list[dict]:
        """Retrieve all tracked channels from the database."""
        channels = []
        last_id = None

        while True:
            queries = [Query.limit(100)]
            if last_id:
                queries.append(Query.cursor_after(last_id))

            response = self._db.list_rows(
                database_id=self._config.database_id,
                table_id=self._config.channels_collection_id,
                queries=queries,
            )

            docs = response.rows if hasattr(response, 'rows') else response.get("rows", response.get("documents", []))
            if not docs:
                break

            # Handle both Pydantic model and dict responses
            for doc in docs:
                if hasattr(doc, '__dict__') and hasattr(doc, 'data'):
                    # Pydantic Row model — flatten data into a dict
                    d = {"$id": doc.id, **doc.data}
                    channels.append(d)
                elif isinstance(doc, dict):
                    channels.append(doc)
                else:
                    channels.append(dict(doc))

            last_doc = docs[-1]
            last_id = last_doc.id if hasattr(last_doc, 'id') else last_doc.get("$id")

            if len(docs) < 100:
                break

        logger.info(f"Fetched {len(channels)} channels from Appwrite")
        return channels

    # --- Video Operations -----------------------------------------------------

    def get_existing_video_ids(self, video_ids: list[str]) -> set[str]:
        """
        Check which video IDs already exist and are completed/processing.
        Failed videos are NOT included — they are eligible for retry.
        Returns a set of already-processed video IDs to skip.
        """
        existing = set()
        batch_size = 100

        for i in range(0, len(video_ids), batch_size):
            batch = video_ids[i : i + batch_size]
            try:
                response = self._db.list_rows(
                    database_id=self._config.database_id,
                    table_id=self._config.videos_collection_id,
                    queries=[
                        Query.equal("video_id", batch),
                        Query.select(["video_id", "status"]),
                        Query.limit(batch_size),
                    ],
                )
                rows = response.rows if hasattr(response, 'rows') else response.get("rows", response.get("documents", []))
                for row in rows:
                    vid = row.data.get("video_id") if hasattr(row, 'data') else row.get("video_id")
                    status = row.data.get("status") if hasattr(row, 'data') else row.get("status")
                    # Only skip completed/processing — allow retry on failed
                    if vid and status in ("completed", "processing", "pending"):
                        existing.add(vid)
            except AppwriteException as e:
                logger.error(f"Error checking existing videos: {e.message}")
                raise

        return existing

    def get_failed_video_doc_id(self, video_id: str) -> Optional[str]:
        """
        Look up a failed video row by video_id and return its document $id.
        Used for retrying failed summarizations.
        """
        try:
            response = self._db.list_rows(
                database_id=self._config.database_id,
                table_id=self._config.videos_collection_id,
                queries=[
                    Query.equal("video_id", [video_id]),
                    Query.equal("status", ["failed"]),
                    Query.limit(1),
                ],
            )
            rows = response.rows if hasattr(response, 'rows') else response.get("rows", response.get("documents", []))
            if rows:
                row = rows[0]
                return row.id if hasattr(row, 'id') else row.get("$id")
        except AppwriteException as e:
            logger.warning(f"Error looking up failed video {video_id}: {e.message}")
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
                    "title": title,
                    "published_at": published_at,
                    "thumbnail_url": thumbnail_url,
                    "ai_summary": "",
                    "status": status,
                    "error_message": "",
                },
            )
            doc_id = row.id if hasattr(row, 'id') else row.get("$id")
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
        row = self._db.update_row(
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
            data={"status": "processing"},
        )
        return {"$id": document_id}
