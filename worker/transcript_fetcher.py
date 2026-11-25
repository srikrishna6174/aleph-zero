"""
YouTube Transcript Fetcher
===========================
Extracts and processes video transcripts using a multi-layer fallback strategy.

Fetch Order:
  1. youtube-transcript-api (fastest, pure Python)
  2. yt-dlp (more robust, handles YouTube anti-bot better on cloud IPs)
  3. Raises TranscriptFetchError — caller may choose AI fallback from metadata
"""

from collections import deque
import json
import logging
import os
import re
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

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
    source: str = "youtube-transcript-api"  # which layer succeeded


class TranscriptFetchError(Exception):
    """Custom exception for transcript fetching failures."""
    pass


def fetch_transcript(video_id: str, chunk_size: int = 15000) -> TranscriptResult:
    """
    Fetch the transcript for a YouTube video using a multi-layer fallback.

    Layer 1: youtube-transcript-api (fast, pure-Python)
    Layer 2: yt-dlp subprocess (more robust against cloud IP blocks)
    """
    errors = []

    # ── Layer 1: youtube-transcript-api ──────────────────────────────────────
    try:
        result = _fetch_via_ytt_api(video_id, chunk_size)
        logger.info(f"[Layer 1] youtube-transcript-api succeeded for {video_id}")
        return result
    except TranscriptFetchError as e:
        logger.warning(f"[Layer 1] youtube-transcript-api failed for {video_id}: {e}")
        errors.append(f"Layer 1 (youtube-transcript-api): {e}")

    # ── Layer 2: yt-dlp ──────────────────────────────────────────────────────
    try:
        result = _fetch_via_ytdlp(video_id, chunk_size)
        logger.info(f"[Layer 2] yt-dlp succeeded for {video_id}")
        return result
    except TranscriptFetchError as e:
        logger.warning(f"[Layer 2] yt-dlp failed for {video_id}: {e}")
        errors.append(f"Layer 2 (yt-dlp): {e}")

    # ── All layers exhausted ──────────────────────────────────────────────────
    raise TranscriptFetchError(
        f"All transcript layers failed for {video_id}. " + " | ".join(errors)
    )


def _extract_snippet_text(snippet) -> str:
    """Extract plain text from either a v1.x FetchedTranscriptSnippet or a dict."""
    if isinstance(snippet, dict):
        return (snippet.get("text") or "").strip()
    text = getattr(snippet, "text", None)
    if text is not None:
        return str(text).strip()
    return str(snippet).strip()


# ─── Layer 1: youtube-transcript-api ─────────────────────────────────────────

def _fetch_via_ytt_api(video_id: str, chunk_size: int) -> TranscriptResult:
    """Fetch transcript using the youtube-transcript-api library."""
    logger.debug(f"[Layer 1] Trying youtube-transcript-api for {video_id}")

    try:
        transcript_list = _ytt_api.list(video_id)
    except TranscriptsDisabled:
        raise TranscriptFetchError(f"Transcripts are disabled for video {video_id}")
    except VideoUnavailable:
        raise TranscriptFetchError(f"Video {video_id} is unavailable")
    except CouldNotRetrieveTranscript as e:
        raise TranscriptFetchError(f"Could not retrieve transcripts for {video_id}: {e}")
    except Exception as e:
        raise TranscriptFetchError(f"Unexpected error listing transcripts for {video_id}: {e}")

    transcript_data = None
    language = "en"
    was_translated = False

    # Strategy 1: Try to find a native English transcript
    try:
        english_transcript = transcript_list.find_transcript(["en", "en-US", "en-GB", "en-IN"])
        transcript_data = english_transcript.fetch()
        language = english_transcript.language_code
        logger.debug(f"[Layer 1] Found native English transcript for {video_id} ({language})")
    except NoTranscriptFound:
        logger.debug(f"[Layer 1] No native English transcript for {video_id}, trying translation...")

        # Strategy 2: Find any transcript and translate to English (with fallback to original)
        try:
            available_transcripts = list(transcript_list)
            if not available_transcripts:
                raise TranscriptFetchError(f"No transcripts found for video {video_id}")

            # Prefer manually created transcripts over auto-generated ones
            selected = next(
                (t for t in available_transcripts if not t.is_generated),
                available_transcripts[0],
            )
            original_language = selected.language_code

            translation_languages = [
                lang.get("language_code", "") if isinstance(lang, dict) else getattr(lang, "language_code", "")
                for lang in (selected.translation_languages or [])
            ]
            is_translatable = "en" in translation_languages

            if is_translatable:
                try:
                    transcript_data = selected.translate("en").fetch()
                    language = f"{original_language}->en"
                    was_translated = True
                except Exception as trans_err:
                    logger.debug(
                        f"[Layer 1] Translation to English failed ({trans_err}), "
                        f"falling back to raw {original_language} transcript"
                    )
                    transcript_data = selected.fetch()
                    language = original_language
            else:
                transcript_data = selected.fetch()
                language = original_language

        except TranscriptFetchError:
            raise
        except Exception as e:
            raise TranscriptFetchError(f"Failed to fetch/translate transcript for {video_id}: {e}")

    if not transcript_data:
        raise TranscriptFetchError(f"Could not retrieve any transcript data for {video_id}")

    parts = []
    for snippet in transcript_data:
        text = _extract_snippet_text(snippet)
        if text:
            parts.append(text.replace("\n", " "))

    full_text = re.sub(r"\s+", " ", " ".join(parts)).strip()

    if not full_text:
        raise TranscriptFetchError(f"Transcript for {video_id} is empty after concatenation")

    chunks = _chunk_text(full_text, chunk_size)
    logger.debug(f"[Layer 1] {video_id}: {len(full_text)} chars, {len(chunks)} chunks, lang={language}")

    return TranscriptResult(
        text=full_text,
        language=language,
        was_translated=was_translated,
        chunks=chunks,
        source="youtube-transcript-api",
    )


# ─── Layer 2: yt-dlp ─────────────────────────────────────────────────────────

def _fetch_via_ytdlp(video_id: str, chunk_size: int) -> TranscriptResult:
    """
    Fetch transcript using yt-dlp as a subprocess.
    Downloads only subtitle/caption files (no video), then parses them.
    Supports json3 (YouTube native) and vtt formats, with English-first then any-language fallback.
    """
    logger.debug(f"[Layer 2] Trying yt-dlp for {video_id}")

    try:
        subprocess.run(
            ["yt-dlp", "--version"],
            capture_output=True, check=True, timeout=10,
        )
    except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired) as e:
        raise TranscriptFetchError(f"yt-dlp not available: {e}")

    video_url = f"https://www.youtube.com/watch?v={video_id}"

    with tempfile.TemporaryDirectory() as tmpdir:
        output_template = os.path.join(tmpdir, "%(id)s.%(ext)s")

        # Try English captions first across json3/vtt, then any available language
        attempts = [
            ("json3", "en,en-US,en-GB,en.*"),
            ("vtt", "en,en-US,en-GB,en.*"),
            ("json3", "all,-live_chat"),
            ("vtt", "all,-live_chat"),
        ]
        for sub_format, sub_langs in attempts:
            try:
                result = _ytdlp_download_subs(
                    video_url=video_url,
                    tmpdir=tmpdir,
                    output_template=output_template,
                    sub_format=sub_format,
                    sub_langs=sub_langs,
                )
                if result:
                    text, language, was_translated = result
                    if text.strip():
                        chunks = _chunk_text(text, chunk_size)
                        logger.debug(
                            f"[Layer 2] yt-dlp {sub_format}: {len(text)} chars, "
                            f"{len(chunks)} chunks, lang={language}"
                        )
                        return TranscriptResult(
                            text=text,
                            language=language,
                            was_translated=was_translated,
                            chunks=chunks,
                            source=f"yt-dlp ({sub_format})",
                        )
            except Exception as e:
                logger.debug(f"[Layer 2] yt-dlp {sub_format} ({sub_langs}) attempt failed: {e}")
                continue

    raise TranscriptFetchError(f"yt-dlp could not retrieve any captions for {video_id}")


def _ytdlp_download_subs(
    video_url: str,
    tmpdir: str,
    output_template: str,
    sub_format: str,
    sub_langs: str = "en,en-US,en-GB,en.*",
) -> tuple[str, str, bool] | None:
    """
    Run yt-dlp to download subtitles for a video.
    Returns (text, language_code, was_translated) or None if no subs found.
    """
    cmd = [
        "yt-dlp",
        "--skip-download",
        "--write-sub",
        "--write-auto-sub",
        "--sub-lang", sub_langs,
        "--sub-format", sub_format,
        "--no-playlist",
        "--no-warnings",
        "--quiet",
        "-o", output_template,
        video_url,
    ]

    logger.debug(f"[Layer 2] Running yt-dlp ({sub_format}, {sub_langs})")

    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60,
        )
    except subprocess.TimeoutExpired:
        raise TranscriptFetchError("yt-dlp timed out after 60 seconds")

    if proc.returncode != 0:
        stderr = proc.stderr.strip()
        stdout = proc.stdout.strip()
        raise TranscriptFetchError(
            f"yt-dlp exited with code {proc.returncode}. "
            f"stderr={stderr!r} stdout={stdout!r}"
        )

    sub_files = list(Path(tmpdir).glob(f"*.{sub_format}"))
    if not sub_files:
        sub_files = list(Path(tmpdir).glob(f"*.*.{sub_format}"))

    if not sub_files:
        return None

    # Prefer English files if multiple languages were downloaded
    chosen_file = next(
        (f for f in sub_files if ".en" in f.stem),
        sub_files[0],
    )
    language = "en"
    was_translated = False

    stem = chosen_file.stem
    parts = stem.rsplit(".", 1)
    if len(parts) == 2:
        lang_code = parts[1]
        if lang_code.endswith("-orig"):
            lang_code = lang_code[:-5]
        language = lang_code
        if not language.startswith("en"):
            was_translated = True

    try:
        text = _parse_subtitle_file(chosen_file, sub_format)
    except Exception as e:
        raise TranscriptFetchError(f"Failed to parse subtitle file {chosen_file}: {e}")

    return text, language, was_translated


def _parse_subtitle_file(filepath: Path, sub_format: str) -> str:
    """Parse a subtitle file and return concatenated plain text."""
    content = filepath.read_text(encoding="utf-8", errors="replace")

    if sub_format == "json3":
        return _parse_json3(content)
    elif sub_format in ("vtt", "webvtt"):
        return _parse_vtt(content)
    else:
        return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", content)).strip()


def _parse_json3(content: str) -> str:
    """Parse YouTube's json3 subtitle format."""
    try:
        data = json.loads(content)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid json3 format: {e}")

    texts = []
    for event in data.get("events", []):
        segs = event.get("segs", [])
        if not segs:
            continue
        segment_text = "".join(seg.get("utf8", "") for seg in segs)
        segment_text = segment_text.replace("\n", " ").strip()
        # Strip non-speech annotations like [Music], [Applause], [♪♪♪]
        cleaned = re.sub(r"\[[^\]]*\]", "", segment_text).strip()
        if cleaned:
            texts.append(cleaned)

    return re.sub(r"\s+", " ", " ".join(texts)).strip()


def _parse_vtt(content: str) -> str:
    """
    Parse WebVTT subtitle format into plain text.
    Removes timestamps, positioning cues, HTML tags, and adjacent rolling duplicates.
    """
    lines = content.splitlines()
    recent: deque[str] = deque(maxlen=6)
    texts = []

    for line in lines:
        line = line.strip()

        if (
            not line
            or line.startswith("WEBVTT")
            or line.startswith("Kind:")
            or line.startswith("Language:")
            or "-->" in line
        ):
            continue

        if line.isdigit():
            continue

        clean = re.sub(r"<[^>]+>", "", line).strip()

        if re.match(r"^[a-z]+:[^\s]", clean, re.IGNORECASE):
            continue

        if clean and clean not in recent:
            recent.append(clean)
            texts.append(clean)

    return re.sub(r"\s+", " ", " ".join(texts)).strip()


# ─── Text Chunking ────────────────────────────────────────────────────────────

def _chunk_text(text: str, chunk_size: int) -> list[str]:
    """
    Split text into chunks of approximately `chunk_size` characters.
    Prefers sentence boundaries, falling back to word boundaries.
    """
    if len(text) <= chunk_size:
        return [text]

    chunks = []
    current_pos = 0

    while current_pos < len(text):
        end_pos = min(current_pos + chunk_size, len(text))

        if end_pos < len(text):
            best_break = -1
            search_start = max(current_pos + 1, end_pos - 300)

            for i in range(end_pos, search_start, -1):
                if text[i - 1] in ".!?" and (i >= len(text) or text[i] == " "):
                    best_break = i
                    break

            if best_break == -1:
                for i in range(end_pos, search_start, -1):
                    if text[i - 1] == " ":
                        best_break = i
                        break

            if best_break > current_pos:
                end_pos = best_break

        chunk = text[current_pos:end_pos].strip()
        if chunk:
            chunks.append(chunk)

        current_pos = max(end_pos, current_pos + 1)

    return chunks
