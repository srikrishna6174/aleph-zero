"""
Configuration module for the YouTube Channel Tracker worker.
Loads environment variables and provides typed access to all settings.
"""

import os
from dataclasses import dataclass

# Load .env file for local development (optional — CI injects env vars directly)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


@dataclass(frozen=True)
class AppwriteConfig:
    """Appwrite connection and resource configuration."""
    endpoint: str
    project_id: str
    api_key: str
    database_id: str
    channels_collection_id: str
    subscriptions_collection_id: str
    videos_collection_id: str


@dataclass(frozen=True)
class GeminiConfig:
    """Gemini API configuration."""
    api_key: str
    model: str
    max_output_tokens: int


@dataclass(frozen=True)
class WorkerConfig:
    """Worker processing configuration."""
    rss_lookback_minutes: int    # How far back to check for new videos
    transcript_chunk_size: int   # Max characters per transcript chunk
    max_retries: int             # Max retry attempts for API calls
    retry_delay_seconds: int     # Delay between retries


def _require_env(key: str) -> str:
    """Get a required environment variable or raise an error."""
    value = os.getenv(key)
    if not value:
        raise EnvironmentError(f"Required environment variable '{key}' is not set.")
    return value


def get_appwrite_config() -> AppwriteConfig:
    return AppwriteConfig(
        endpoint=os.getenv("APPWRITE_ENDPOINT", "https://fra.cloud.appwrite.io/v1"),
        project_id=_require_env("APPWRITE_PROJECT_ID"),
        api_key=_require_env("APPWRITE_API_KEY"),
        database_id=os.getenv("APPWRITE_DATABASE_ID", "yt_tracker_db"),
        channels_collection_id=os.getenv("APPWRITE_CHANNELS_COLLECTION_ID", "channels"),
        subscriptions_collection_id=os.getenv("APPWRITE_SUBSCRIPTIONS_COLLECTION_ID", "subscriptions"),
        videos_collection_id=os.getenv("APPWRITE_VIDEOS_COLLECTION_ID", "videos"),
    )


def get_gemini_config() -> GeminiConfig:
    return GeminiConfig(
        api_key=_require_env("GEMINI_API_KEY"),
        model=os.getenv("GEMINI_MODEL", "gemini-2.0-flash"),
        max_output_tokens=int(os.getenv("GEMINI_MAX_OUTPUT_TOKENS", "2048")),
    )


def get_worker_config() -> WorkerConfig:
    return WorkerConfig(
        rss_lookback_minutes=int(os.getenv("RSS_LOOKBACK_MINUTES", "70")),
        transcript_chunk_size=int(os.getenv("TRANSCRIPT_CHUNK_SIZE", "4000")),
        max_retries=int(os.getenv("MAX_RETRIES", "3")),
        retry_delay_seconds=int(os.getenv("RETRY_DELAY_SECONDS", "5")),
    )
