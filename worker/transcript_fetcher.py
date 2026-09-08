"""
YouTube Transcript Fetcher
===========================
Extracts and processes video transcripts using youtube-transcript-api v1.x.
Implements the English-first fallback logic with translation support.
"""

import logging
from dataclasses import dataclass

from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    TranscriptsDisabled,
    NoTranscriptFound,
    VideoUnavailable,
    CouldNotRetrieveTranscript,
)

logger = logging.getLogger(__name__)

# Instantiate the API client (v1.x requires an instance)
_ytt_api = YouTubeTranscriptApi()


@dataclass
class TranscriptResult:
    """Result of transcript extraction."""
    text: str
    language: str
    was_translated: bool
    chunks: list[str]


class TranscriptFetchError(Exception):
    """Custom exception for transcript fetching failures."""
    pass


def fetch_transcript(video_id: str, chunk_size: int = 4000) -> TranscriptResult:
    """
    Fetch the transcript for a YouTube video.

    Translation Logic:
        1. Attempt to fetch a native English transcript.
        2. If unavailable, fetch the default language transcript
           and apply .translate('en') if the transcript is translatable.
        3. If no translatable transcript is found, use the raw transcript as-is.

    Args:
        video_id: The YouTube video ID.
        chunk_size: Maximum character count per transcript chunk.

    Returns:
        TranscriptResult with full text, language info, and chunked segments.

    Raises:
        TranscriptFetchError: If no transcript can be retrieved.
    """
    logger.info(f"Fetching transcript for video {video_id}")

    try:
        transcript_list = _ytt_api.list(video_id)
    except TranscriptsDisabled:
        raise TranscriptFetchError(
            f"Transcripts are disabled for video {video_id}"
        )
    except VideoUnavailable:
        raise TranscriptFetchError(
            f"Video {video_id} is unavailable"
        )
    except CouldNotRetrieveTranscript as e:
        raise TranscriptFetchError(
            f"Could not retrieve transcripts for {video_id}: {e}"
        )
    except Exception as e:
        raise TranscriptFetchError(
            f"Unexpected error listing transcripts for {video_id}: {e}"
        )

    transcript_data = None
    language = "en"
    was_translated = False

    # Strategy 1: Try to find a native English transcript
    try:
        english_transcript = transcript_list.find_transcript(["en", "en-US", "en-GB"])
        transcript_data = english_transcript.fetch()
        language = english_transcript.language_code
        logger.info(f"Found native English transcript for {video_id} ({language})")
    except NoTranscriptFound:
        logger.info(f"No native English transcript for {video_id}, trying translation...")

        # Strategy 2: Find any transcript and translate to English
        try:
            available_transcripts = list(transcript_list)
            if not available_transcripts:
                raise TranscriptFetchError(
                    f"No transcripts found for video {video_id}"
                )

            # Prefer manually created transcripts over auto-generated ones
            selected = None
            for t in available_transcripts:
                if not t.is_generated:
                    selected = t
                    break
            if selected is None:
                selected = available_transcripts[0]

            original_language = selected.language_code
            logger.info(
                f"Found {original_language} transcript for {video_id}"
            )

            # Check if translation to English is available
            translation_languages = [
                lang.get("language_code", "") if isinstance(lang, dict) else getattr(lang, "language_code", "")
                for lang in (selected.translation_languages or [])
            ]
            is_translatable = "en" in translation_languages

            if is_translatable:
                translated = selected.translate("en")
                transcript_data = translated.fetch()
                language = f"{original_language}->en"
                was_translated = True
                logger.info(f"Successfully translated {original_language}->en for {video_id}")
            else:
                # Use the original transcript without translation
                transcript_data = selected.fetch()
                language = original_language
                logger.warning(
                    f"Transcript for {video_id} cannot be translated to English, "
                    f"using raw {original_language} text"
                )

        except TranscriptFetchError:
            raise
        except Exception as e:
            raise TranscriptFetchError(
                f"Failed to fetch/translate transcript for {video_id}: {e}"
            )

    if not transcript_data:
        raise TranscriptFetchError(
            f"Could not retrieve any transcript data for {video_id}"
        )

    # Concatenate all transcript segments into full text
    # v1.x returns FetchedTranscript which is iterable of snippet dicts
    full_text = " ".join(
        snippet.get("text", "").strip() if isinstance(snippet, dict) else str(snippet).strip()
        for snippet in transcript_data
        if (snippet.get("text", "").strip() if isinstance(snippet, dict) else str(snippet).strip())
    )

    if not full_text:
        raise TranscriptFetchError(
            f"Transcript for {video_id} is empty after concatenation"
        )

    # Chunk the text for processing
    chunks = _chunk_text(full_text, chunk_size)

    logger.info(
        f"Transcript for {video_id}: {len(full_text)} chars, "
        f"{len(chunks)} chunks, lang={language}"
    )

    return TranscriptResult(
        text=full_text,
        language=language,
        was_translated=was_translated,
        chunks=chunks,
    )


def _chunk_text(text: str, chunk_size: int) -> list[str]:
    """
    Split text into chunks of approximately `chunk_size` characters.
    Splits at sentence boundaries when possible.
    """
    if len(text) <= chunk_size:
        return [text]

    chunks = []
    current_pos = 0

    while current_pos < len(text):
        end_pos = min(current_pos + chunk_size, len(text))

        if end_pos < len(text):
            best_break = -1
            search_start = max(current_pos, end_pos - 200)

            for i in range(end_pos, search_start, -1):
                if text[i - 1] in ".!?" and (i >= len(text) or text[i] == " "):
                    best_break = i
                    break

            if best_break > current_pos:
                end_pos = best_break

        chunk = text[current_pos:end_pos].strip()
        if chunk:
            chunks.append(chunk)

        current_pos = end_pos

    return chunks
