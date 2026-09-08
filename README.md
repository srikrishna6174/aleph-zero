# TubeDigest — AI-Powered YouTube Channel Tracker

A multi-user SaaS application that tracks YouTube channels and delivers hourly, AI-generated summaries of new uploads.

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React (Vite), Tailwind CSS v4 |
| **Backend/BaaS** | Appwrite (Auth, Database, Realtime) |
| **Background Worker** | Python 3.12, Docker, Cron |
| **AI & APIs** | youtube-transcript-api, YouTube RSS, Google Gemini API |

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                React Frontend (Vite)                 │
│   Auth ─── Dashboard ─── Channel Mgmt ─── Realtime  │
└───────────────────────┬──────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────┐
│                 Appwrite BaaS                        │
│   Auth Service ── Database ── Realtime Engine        │
│   ┌─────────┐  ┌──────────────┐  ┌────────┐        │
│   │ Users   │  │ Channels     │  │ Videos │        │
│   │ (Auth)  │  │ Subscriptions│  │        │        │
│   └─────────┘  └──────────────┘  └────────┘        │
└───────────────────────┬──────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────┐
│            Python Worker (Docker + Cron)              │
│   RSS Fetch ── Dedup ── Transcript ── Gemini AI      │
│              (Every hour)                            │
└──────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.12+
- Docker & Docker Compose
- An [Appwrite Cloud](https://cloud.appwrite.io) project (or self-hosted)
- A [Google Gemini API key](https://aistudio.google.com/)

### 1. Initialize the Database

```bash
cd scripts
cp ../worker/.env.example .env   # Edit with your Appwrite credentials
pip install appwrite python-dotenv
python init_db.py
```

### 2. Start the Frontend

```bash
cd frontend
cp .env.example .env             # Edit with your Appwrite Project ID
npm install
npm run dev
```

### 3. Start the Worker

**Option A: Docker (Recommended)**

```bash
cd worker
cp .env.example .env             # Edit with all credentials
cd ..
docker-compose up -d --build
```

**Option B: Run Manually**

```bash
cd worker
cp .env.example .env             # Edit with all credentials
pip install -r requirements.txt
python worker.py                 # Single run
```

## Environment Variables

### Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_APPWRITE_ENDPOINT` | Appwrite API endpoint |
| `VITE_APPWRITE_PROJECT_ID` | Your Appwrite project ID |
| `VITE_APPWRITE_DATABASE_ID` | Database ID (default: `yt_tracker_db`) |

### Worker (`worker/.env`)

| Variable | Description |
|---|---|
| `APPWRITE_ENDPOINT` | Appwrite API endpoint |
| `APPWRITE_PROJECT_ID` | Your Appwrite project ID |
| `APPWRITE_API_KEY` | Server-side API key with DB permissions |
| `GEMINI_API_KEY` | Google Gemini API key |
| `GEMINI_MODEL` | Model name (default: `gemini-2.0-flash`) |
| `RSS_LOOKBACK_MINUTES` | How far back to check (default: `70`) |

## Database Schema

- **channels** — YouTube channels with IDs and RSS URLs
- **subscriptions** — Junction table linking users to channels
- **videos** — Video metadata + AI summaries (deduplicated at video level)

## Key Design Decisions

1. **Deduplication**: Summaries are stored per-video, not per-user. When multiple users subscribe to the same channel, the AI processes each video only once.

2. **Translation Fallback**: The worker first tries native English transcripts, then auto-translates from the original language. The Gemini prompt explicitly handles translation artifacts.

3. **Real-time Updates**: The frontend subscribes to Appwrite Realtime on the videos collection, so new summaries appear instantly without polling.

4. **70-minute Lookback**: The RSS lookback window overlaps by 10 minutes to avoid missing videos between hourly cron runs.

## License

MIT
