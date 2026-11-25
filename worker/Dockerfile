# ─── Build Stage ─────────────────────────────────────────────────
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV WORKER_INTERVAL_MINUTES=70

WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Run worker immediately on startup and repeat every 70 minutes by default
CMD ["sh", "-c", "python worker.py --watch --interval-minutes ${WORKER_INTERVAL_MINUTES:-70}"]
