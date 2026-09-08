# ─── Build Stage ─────────────────────────────────────────────────
FROM python:3.12-slim AS base

# Prevent Python from writing .pyc files and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends cron && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Setup cron job — run worker.py every hour
RUN echo "0 * * * * cd /app && /usr/local/bin/python worker.py >> /var/log/worker.log 2>&1" > /etc/cron.d/worker-cron && \
    chmod 0644 /etc/cron.d/worker-cron && \
    crontab /etc/cron.d/worker-cron && \
    touch /var/log/worker.log

# Create non-root user for running the app (cron needs root, so we use entrypoint)
# The entrypoint script handles passing env vars to the cron context

# Copy entrypoint script
COPY <<'EOF' /entrypoint.sh
#!/bin/bash
set -e

# Export all environment variables so cron can access them
printenv | grep -v "no_proxy" >> /etc/environment

echo "Starting YouTube Tracker Worker..."
echo "Running initial check..."

# Run the worker once immediately on startup
cd /app && python worker.py

echo "Initial run complete. Starting cron scheduler..."

# Start cron in the foreground
cron -f &

# Tail the log file to keep the container running and show output
tail -f /var/log/worker.log
EOF

RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
