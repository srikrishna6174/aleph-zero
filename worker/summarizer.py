"""
Gemini AI Summarizer
=====================
Sends chunked video transcripts to the Google Gemini API
and produces structured summaries with intelligent quota/error handling
and automatic multi-model fallback.
"""

import logging
import re
import time
from typing import Optional

from google import genai
from google.genai import types

from config import GeminiConfig

logger = logging.getLogger(__name__)

# Ordered fallback list used when the configured primary model is deprecated (404),
# daily-quota exhausted (429 PerDay), or temporarily overloaded (503).
FALLBACK_MODELS = [
    "gemini-3.6-flash",
    "gemini-flash-lite-latest",
    "gemini-3.5-flash-lite",
    "gemini-4-hydrogen",
    "gemini-3.1-flash-lite",
    "gemini-3.1-flash-lite-preview",
    "gemini-3-flash-preview",
    "gemini-3.5-flash",
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-flash-latest",
    "gemini-3.1-pro-preview",
    "gemma-4-31b-it",
    "gemma-4-26b-a4b-it",
]


def _compact_prompt(prompt: str, max_chars: int = 36000) -> str:
    """Keep beginning, middle, and ending slices when a prompt exceeds TPM limits."""
    if len(prompt) <= max_chars:
        return prompt
    head = int(max_chars * 0.45)
    mid_len = int(max_chars * 0.27)
    tail = max_chars - head - mid_len
    mid_start = max(head, (len(prompt) - mid_len) // 2)
    return (
        prompt[:head]
        + "\n\n[...middle transcript excerpted for model length limit...]\n\n"
        + prompt[mid_start : mid_start + mid_len]
        + "\n\n[...final transcript excerpted for model length limit...]\n\n"
        + prompt[-tail:]
    )

# ─── System Prompt ───────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an expert YouTube video summarizer. Your task is to produce a clear,
well-structured summary of a video based on its transcript.

## Instructions

1. **Extract Core Arguments**: Identify and summarize the main points, arguments, key takeaways, and conclusions presented in the video.

2. **Discard Irrelevant Content**: Remove the following from your summary:
   - Sponsor reads, ad segments, and promotional content
   - Calls to action (like/subscribe/comment reminders)
   - Channel intros/outros and filler phrases
   - Off-topic tangents that don't contribute to the main content

3. **Handle Translation Artifacts**: The transcript may have been auto-translated from another language. If you notice:
   - Imperfect grammar or awkward phrasing — clean it up
   - Mistranslated technical terms — use the correct English terminology where possible
   - Broken sentence structure — reconstruct for clarity

4. **Output Format**: Use clean Markdown with these exact section headings:
   ## TL;DR
   A 1-2 sentence executive summary.

   ## Key Points
   - Bulleted list of the main arguments/topics covered (use **bold** lead-ins where helpful)

   ## Details
   A concise narrative summary expanding on the key points (2-4 short paragraphs).

   ## Notable Quotes
   > Include 1-2 memorable or insightful direct quotes if applicable (omit this section if none).

5. **Tone**: Write in a professional, neutral, and informative tone. Be concise but thorough.

6. **Length**: Keep the total summary between 200-500 words unless the content is exceptionally dense."""


CHUNK_SUMMARY_PROMPT = """Summarize the following section of a video transcript. Focus on extracting the key points and arguments.
This is part {chunk_num} of {total_chunks} of the full transcript.

Transcript section:
{chunk_text}"""


FINAL_MERGE_PROMPT = """Below are summaries of different sections of the same video transcript.
Combine them into a single, cohesive summary following the exact Markdown headings specified in your instructions (## TL;DR, ## Key Points, ## Details, ## Notable Quotes).

Remove any duplicate points and ensure logical flow.

Section summaries:
{section_summaries}"""


SINGLE_CHUNK_PROMPT = """Summarize the following video transcript according to your instructions.

Transcript:
{transcript_text}"""


NO_TRANSCRIPT_PROMPT = """No transcript is available for this video. Based only on the information provided below, write the best summary you can.

IMPORTANT: Be transparent — start the TL;DR with "(No transcript available)" to inform the reader.
Do your best to summarize the likely content, key topics, and context from the available title and description without fabricating specific claims not supported by the metadata.

Video Title: {video_title}
{description_section}

Output Format (use exact Markdown headings):
## TL;DR
(No transcript available) A 1-2 sentence summary based on available metadata.

## Key Points
- Bullet list of subjects/topics covered, based on the title and description

## Details
Brief note explaining the context from metadata and noting that captions were disabled or unavailable for this video."""


def _classify_gemini_error(err: Exception) -> tuple[str, Optional[float]]:
    """
    Classify a Gemini SDK exception accurately without false-positive substring matches.
    Returns (category, suggested_retry_seconds) where category is one of:
      'not_found' | 'daily_quota' | 'rate_limit' | 'server_error' | 'fatal'
    """
    code = getattr(err, "code", None)
    error_str = str(err)
    lower = error_str.lower()

    if code == 404 or "404 not_found" in lower or "'code': 404" in lower or '"code": 404' in lower:
        return "not_found", None

    if code == 429 or "429 resource_exhausted" in lower or "'code': 429" in lower or "too many requests" in lower:
        retry_match = re.search(r"retry in (\d+(?:\.\d+)?)s", lower)
        retry_secs = float(retry_match.group(1)) if retry_match else None
        if "perday" in lower or "per_day" in lower or "requestsperday" in lower or "generate_content_free_tier_requests" in lower:
            # If retry hint is > 60s or PerDay metric is cited, skip immediately to next model
            if "perday" in lower or "per_day" in lower or (retry_secs is not None and retry_secs > 60):
                return "daily_quota", retry_secs
        return "rate_limit", retry_secs

    if code in (500, 502, 503, 504) or "503 unavailable" in lower or "500 internal" in lower or "service unavailable" in lower:
        return "server_error", None

    return "fatal", None


# ─── Summarizer Class ───────────────────────────────────────────────────────

class Summarizer:
    """Handles AI summarization of video transcripts via Google Gemini."""

    def __init__(self, config: GeminiConfig):
        self._config = config
        self._client = genai.Client(api_key=config.api_key)
        self._model = config.model
        self._max_output_tokens = config.max_output_tokens
        self._unavailable_models: set[str] = set()

    def _model_candidates(self) -> list[str]:
        """Return ordered list of still-viable models starting with configured primary."""
        candidates = [self._model]
        for fallback in FALLBACK_MODELS:
            if fallback not in candidates:
                candidates.append(fallback)
        viable = [m for m in candidates if m not in self._unavailable_models]
        return viable or candidates

    def summarize(
        self,
        chunks: list[str],
        video_title: str = "",
        max_retries: int = 3,
        retry_delay: int = 5,
    ) -> str:
        """
        Summarize a video transcript (provided as chunks).
        """
        if not chunks:
            return "No transcript available for summarization."

        title_context = f'\nVideo Title: "{video_title}"\n' if video_title else ""

        if len(chunks) == 1:
            prompt = SINGLE_CHUNK_PROMPT.format(transcript_text=chunks[0])
            return self._call_gemini(
                title_context + prompt, max_retries, retry_delay
            )

        logger.info(f"Processing {len(chunks)} transcript chunks")
        section_summaries = []

        for i, chunk in enumerate(chunks, 1):
            prompt = CHUNK_SUMMARY_PROMPT.format(
                chunk_num=i,
                total_chunks=len(chunks),
                chunk_text=chunk,
            )
            section_summary = self._call_gemini(
                title_context + prompt, max_retries, retry_delay
            )
            section_summaries.append(
                f"--- Section {i}/{len(chunks)} ---\n{section_summary}"
            )
            logger.info(f"Summarized chunk {i}/{len(chunks)}")

            if i < len(chunks):
                time.sleep(2)

        time.sleep(2)

        merge_prompt = FINAL_MERGE_PROMPT.format(
            section_summaries="\n\n".join(section_summaries)
        )
        final_summary = self._call_gemini(
            title_context + merge_prompt, max_retries, retry_delay
        )
        logger.info("Successfully merged chunk summaries into final summary")
        return final_summary

    def summarize_from_metadata(
        self,
        video_title: str,
        description: str = "",
        max_retries: int = 3,
        retry_delay: int = 5,
    ) -> str:
        """
        Generate a best-effort summary using only title and description.
        Called when ALL transcript layers fail (no captions on the video).
        """
        logger.info(f"Generating metadata-only summary for: {video_title!r}")
        description_section = (
            f"Description:\n{description.strip()}"
            if description and description.strip()
            else "Description: (not available)"
        )
        prompt = NO_TRANSCRIPT_PROMPT.format(
            video_title=video_title,
            description_section=description_section,
        )
        return self._call_gemini(prompt, max_retries, retry_delay)

    def _call_gemini(
        self, prompt: str, max_retries: int, retry_delay: int
    ) -> str:
        """
        Make a call to Gemini with retry logic, TPM-safe sizing, and multi-model fallback.
        """
        last_error: Optional[Exception] = None
        passes = [prompt]
        if len(prompt) > 45000:
            passes.append(_compact_prompt(prompt, 45000))

        for pass_idx, pass_prompt in enumerate(passes, 1):
            if pass_idx > 1:
                logger.info("Retrying transient overloaded models with compact 45k prompt window")
                time.sleep(3)

            for model_name in self._model_candidates():
                is_gemma = model_name.startswith("gemma-")
                effective_max_tokens = (
                    max(self._max_output_tokens, 4096)
                    if is_gemma
                    else self._max_output_tokens
                )
                effective_prompt = (
                    _compact_prompt(pass_prompt, 34000) if is_gemma else pass_prompt
                )

                for attempt in range(1, max_retries + 1):
                    try:
                        response = self._client.models.generate_content(
                            model=model_name,
                            contents=effective_prompt,
                            config=types.GenerateContentConfig(
                                system_instruction=SYSTEM_PROMPT,
                                max_output_tokens=effective_max_tokens,
                                temperature=0.3,
                                automatic_function_calling=types.AutomaticFunctionCallingConfig(
                                    disable=True
                                ),
                            ),
                        )

                        if response.text and response.text.strip():
                            if model_name != self._model:
                                logger.info(
                                    f"Used fallback model '{model_name}' (primary '{self._model}' unavailable/exhausted)"
                                )
                            return response.text.strip()

                        logger.warning(
                            f"Gemini ({model_name}) returned empty response on attempt {attempt}"
                        )
                        last_error = ValueError("Empty response from Gemini")

                    except Exception as e:
                        last_error = e
                        category, retry_secs = _classify_gemini_error(e)

                        if category == "not_found":
                            logger.warning(
                                f"Model '{model_name}' unavailable (404). Switching to fallback model..."
                            )
                            self._unavailable_models.add(model_name)
                            break

                        if category == "daily_quota":
                            logger.warning(
                                f"Model '{model_name}' daily quota exhausted (429). Switching to fallback model..."
                            )
                            self._unavailable_models.add(model_name)
                            break

                        if category == "server_error":
                            if attempt < min(max_retries, 2):
                                logger.warning(
                                    f"Transient 503/5xx on '{model_name}' "
                                    f"(attempt {attempt}/{min(max_retries, 2)}): retrying in 3s"
                                )
                                time.sleep(3)
                                continue
                            logger.warning(
                                f"Model '{model_name}' overloaded ({category}). Switching to fallback model..."
                            )
                            break

                        if category == "rate_limit":
                            if retry_secs is not None and retry_secs > 15:
                                logger.warning(
                                    f"Rate limit wait ({retry_secs:.0f}s) on '{model_name}'; switching to fallback model..."
                                )
                                break
                            if attempt < min(max_retries, 2):
                                wait_time = (
                                    min(max(retry_secs, 3.0), 10.0)
                                    if retry_secs is not None
                                    else min(retry_delay * attempt, 10)
                                )
                                logger.warning(
                                    f"Rate limit on '{model_name}' "
                                    f"(attempt {attempt}/{min(max_retries, 2)}): retrying in {wait_time:.0f}s"
                                )
                                time.sleep(wait_time)
                                continue
                            logger.warning(
                                f"Exhausted retries on '{model_name}' ({category}). Trying next model..."
                            )
                            break

                        logger.error(f"Non-retriable Gemini API error: {e}")
                        raise

        raise RuntimeError(
            f"Failed to get Gemini response after trying models {self._model_candidates()}. "
            f"Last error: {last_error}"
        )
