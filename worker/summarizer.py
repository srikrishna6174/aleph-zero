"""
Gemini AI Summarizer
=====================
Sends chunked video transcripts to the Google Gemini API
and produces structured summaries.
"""

import logging
import time
from typing import Optional

from google import genai
from google.genai import types

from config import GeminiConfig

logger = logging.getLogger(__name__)

# ─── System Prompt ───────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an expert YouTube video summarizer. Your task is to produce a clear, well-structured summary of a video based on its transcript.

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

4. **Output Format**: Structure your summary as follows:
   - **TL;DR**: A 1-2 sentence executive summary
   - **Key Points**: Bulleted list of the main arguments/topics covered
   - **Details**: A concise narrative summary expanding on the key points (2-4 paragraphs)
   - **Notable Quotes**: Any particularly insightful or memorable statements (if applicable)

5. **Tone**: Write in a professional, neutral, and informative tone. Be concise but thorough.

6. **Length**: Keep the total summary between 200-500 words unless the content is exceptionally dense."""


CHUNK_SUMMARY_PROMPT = """Summarize the following section of a video transcript. Focus on extracting the key points and arguments. This is part {chunk_num} of {total_chunks} of the full transcript.

Transcript section:
{chunk_text}"""


FINAL_MERGE_PROMPT = """Below are summaries of different sections of the same video transcript. Combine them into a single, cohesive summary following the output format specified in your instructions.

Remove any duplicate points and ensure logical flow.

Section summaries:
{section_summaries}"""


SINGLE_CHUNK_PROMPT = """Summarize the following video transcript according to your instructions.

Transcript:
{transcript_text}"""


# ─── Summarizer Class ───────────────────────────────────────────────────────

class Summarizer:
    """Handles AI summarization of video transcripts via Google Gemini."""

    def __init__(self, config: GeminiConfig):
        self._config = config
        self._client = genai.Client(api_key=config.api_key)
        self._model = config.model
        self._max_output_tokens = config.max_output_tokens

    def summarize(
        self,
        chunks: list[str],
        video_title: str = "",
        max_retries: int = 3,
        retry_delay: int = 5,
    ) -> str:
        """
        Summarize a video transcript (provided as chunks).

        For single-chunk transcripts, sends directly to Gemini.
        For multi-chunk transcripts, summarizes each chunk individually
        then merges into a final cohesive summary.

        Args:
            chunks: List of transcript text chunks.
            video_title: Optional video title for context.
            max_retries: Number of retry attempts on failure.
            retry_delay: Seconds to wait between retries.

        Returns:
            The AI-generated summary as a string.
        """
        if not chunks:
            return "No transcript available for summarization."

        title_context = f'\nVideo Title: "{video_title}"\n' if video_title else ""

        if len(chunks) == 1:
            # Single chunk — direct summarization
            prompt = SINGLE_CHUNK_PROMPT.format(
                transcript_text=chunks[0]
            )
            return self._call_gemini(
                title_context + prompt, max_retries, retry_delay
            )
        else:
            # Multi-chunk — summarize each, then merge
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

            # Merge all section summaries
            merge_prompt = FINAL_MERGE_PROMPT.format(
                section_summaries="\n\n".join(section_summaries)
            )
            final_summary = self._call_gemini(
                title_context + merge_prompt, max_retries, retry_delay
            )
            logger.info("Successfully merged chunk summaries into final summary")
            return final_summary

    def _call_gemini(
        self, prompt: str, max_retries: int, retry_delay: int
    ) -> str:
        """
        Make a single call to the Gemini API with retry logic.

        Handles rate limiting (429), server errors (5xx), and timeouts.
        """
        last_error: Optional[Exception] = None

        for attempt in range(1, max_retries + 1):
            try:
                response = self._client.models.generate_content(
                    model=self._model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_PROMPT,
                        max_output_tokens=self._max_output_tokens,
                        temperature=0.3,  # Lower temperature for factual summarization
                    ),
                )

                if response.text:
                    return response.text.strip()
                else:
                    logger.warning(
                        f"Gemini returned empty response on attempt {attempt}"
                    )
                    last_error = ValueError("Empty response from Gemini")

            except Exception as e:
                last_error = e
                error_str = str(e).lower()

                # Check for rate limiting
                if "429" in error_str or "resource exhausted" in error_str:
                    wait_time = retry_delay * attempt * 2  # Exponential backoff
                    logger.warning(
                        f"Rate limited by Gemini API, waiting {wait_time}s "
                        f"(attempt {attempt}/{max_retries})"
                    )
                    time.sleep(wait_time)
                    continue

                # Check for server errors (retriable)
                if "500" in error_str or "503" in error_str:
                    logger.warning(
                        f"Gemini server error on attempt {attempt}/{max_retries}: {e}"
                    )
                    time.sleep(retry_delay * attempt)
                    continue

                # Non-retriable error
                logger.error(f"Non-retriable Gemini API error: {e}")
                raise

        # Exhausted all retries
        raise RuntimeError(
            f"Failed to get Gemini response after {max_retries} attempts. "
            f"Last error: {last_error}"
        )
