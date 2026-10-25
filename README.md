<div align="center">
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/React-Dark.svg" width="60" alt="React" />
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/TailwindCSS-Dark.svg" width="60" alt="TailwindCSS" />
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/Appwrite.svg" width="60" alt="Appwrite" />
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/Python-Dark.svg" width="60" alt="Python" />
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/Docker.svg" width="60" alt="Docker" />
  <br/><br/>
  
  <h1>📺 TubeDigest</h1>
  <p><strong>AI-Powered YouTube Channel Tracker & Summarizer</strong></p>
  <p>
    Track your favorite YouTube creators and automatically receive concise, intelligent, and highly structured summaries of every new upload powered by Google Gemini AI.
  </p>

  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  [![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
  [![Appwrite](https://img.shields.io/badge/Appwrite-Backend-pink.svg)](https://appwrite.io/)
  [![Python](https://img.shields.io/badge/Python-3.12-yellow.svg)](https://python.org/)
</div>

<br/>

## ✨ Key Features

* 🚀 **Automated Tracking**: Add any YouTube channel (via URL, `@handle`, `/c/`, or ID) and let the background worker automatically fetch new videos via RSS feeds.
* 🤖 **Intelligent AI Summaries**: Uses **Google Gemini AI** to produce highly structured summaries (TL;DR, Key Points, Details, Quotes), stripping out sponsor reads and tangents.
* 🛡️ **Robust Multi-Layer Transcript Fetching**:
  * Layer 1: High-speed `youtube-transcript-api`
  * Layer 2: `yt-dlp` fallback (bypasses anti-bot IP blocks)
  * Layer 3: Metadata fallback (Title + Description) if captions are disabled.
* 🌍 **Auto-Translation**: Automatically detects non-English transcripts and translates them seamlessly into English before summarizing.
* ⚡ **Realtime Updates**: Powered by Appwrite's Realtime Engine, your dashboard updates live as the worker processes videos.
* 🎨 **Premium UI/UX**: Built with **Tailwind CSS v4**, featuring a modern dark-glass aesthetic, micro-animations, skeleton loaders, and gradient typography.

---

## 🏗️ Architecture

```mermaid
graph TD
    subgraph Frontend [React (Vite) Frontend]
        A[Dashboard & Library] -->|Appwrite SDK| B(Appwrite Realtime Database)
        C[Channel Management] -->|CRUD| B
    end
    
    subgraph Backend [Appwrite BaaS]
        B -->|Database| D[(Videos & Channels)]
        B -->|Auth| U[(Users)]
    end

    subgraph Worker [Python Worker (Docker / Cron)]
        E[RSS Fetcher] -->|Polls| YT(YouTube)
        E -->|Deduplicate| D
        F[Transcript Fetcher] -->|yt-dlp / API| YT
        G[Summarizer] -->|Context| GEM(Google Gemini API)
        E --> F
        F --> G
        G -->|Save Summary| D
    end
```

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) 18+
- [Python](https://www.python.org/) 3.12+
- [Docker](https://www.docker.com/) & Docker Compose
- An [Appwrite Cloud](https://cloud.appwrite.io) project (or self-hosted)
- A [Google Gemini API key](https://aistudio.google.com/)

### 1. Initialize the Database
Set up the required Appwrite collections and permissions.
```bash
cd scripts
cp ../worker/.env.example .env   # Edit with your Appwrite API credentials
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

### 3. Start the Background Worker

**Option A: Docker (Recommended)**
Runs silently in the background on an hourly cron schedule.
```bash
cd worker
cp .env.example .env             # Edit with all API credentials (Appwrite + Gemini)
cd ..
docker-compose up -d --build
```

**Option B: Manual Single Run**
```bash
cd worker
cp .env.example .env             
pip install -r requirements.txt
python worker.py                 
```

---

## ⚙️ Environment Variables

### Frontend (`frontend/.env`)
| Variable | Description |
|---|---|
| `VITE_APPWRITE_ENDPOINT` | Appwrite API endpoint (`https://fra.cloud.appwrite.io/v1`) |
| `VITE_APPWRITE_PROJECT_ID` | Your Appwrite project ID |
| `VITE_APPWRITE_DATABASE_ID` | Database ID (default: `6a9d0bb90033cb018bb0`) |

### Worker (`worker/.env`)
| Variable | Description |
|---|---|
| `APPWRITE_ENDPOINT` | Appwrite API endpoint |
| `APPWRITE_PROJECT_ID` | Your Appwrite project ID |
| `APPWRITE_API_KEY` | Server-side API key with DB write permissions |
| `GEMINI_API_KEY` | Google Gemini API key |
| `GEMINI_MODEL` | Model name (default: `gemini-2.0-flash`) |
| `RSS_LOOKBACK_MINUTES` | Recency threshold for new videos (default: `70`) |

---

## 🛠️ Technical Design Decisions

1. **Intelligent Deduplication**: Video tracking is global across the platform. If multiple users subscribe to the same channel, the background worker only processes the video transcript and queries the Gemini AI **once**, drastically saving API costs.
2. **Shorts Avoidance**: The RSS Fetcher actively filters out YouTube Shorts by executing lightweight HEAD HTTP requests, ensuring you only receive high-quality long-form video summaries.
3. **Resilient Channel Parsing**: Complex Regex mapping allows users to input arbitrary YouTube links (`youtube.com/c/mkbhd`, `youtube.com/user/pewdiepie`, `youtube.com/@mrbeast`, etc.) and the system flawlessly identifies the channel structure.
4. **Rate Limit Concurrency**: The worker automatically batches processing and strictly honors Gemini's 15 RPM free-tier limitations using graceful sleeps and retries.

---

## 📄 License
This project is licensed under the MIT License.
