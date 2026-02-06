# AnyVid Downloader

A universal video downloader web application. Paste a URL from YouTube, Instagram, Twitter/X, TikTok, Facebook, or thousands of other supported sites and download the video in your preferred quality.

Built with Next.js on the frontend and FastAPI with yt-dlp on the backend.

---

## Project Structure

```
any-vid-downloader/
  backend/              FastAPI + yt-dlp backend
    main.py             Application entry point
    config.py           Settings from environment variables
    models.py           Pydantic request/response schemas
    services/
      downloader.py     yt-dlp extraction and format processing
    middleware/
      rate_limit.py     In-memory sliding window rate limiter
    requirements.txt    Python dependencies
    Dockerfile          Backend container image
    env.example         Example environment variables
  frontend/             Next.js 15 frontend
    app/
      layout.tsx        Root layout with theme initialization
      page.tsx          Main page
      globals.css       Design system, themes, animations
    components/
      VideoDownloader.tsx   Main downloader component with URL input
      VideoInfo.tsx         Video metadata display
      FormatButtons.tsx     Download format selection grid
      LoadingSpinner.tsx    Loading indicators
      ThemeToggle.tsx       Dark/light mode toggle
    lib/
      api.ts            Backend API client
      types.ts          TypeScript types and helpers
    next.config.ts      Next.js configuration
    package.json        Node dependencies
    Dockerfile          Multi-stage frontend container image
    env.example         Example environment variables
  docker-compose.yml    Run both services together
  .gitignore
```

---

## Requirements

**Backend:**
- Python 3.11+
- ffmpeg (required by yt-dlp for merging formats)

**Frontend:**
- Node.js 18+
- npm, pnpm, or yarn

**Docker (alternative):**
- Docker and Docker Compose

---

## Local Development Setup

### Backend

```sh
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Make sure ffmpeg is installed and available on your PATH.

Copy the example env file and adjust if needed:

```sh
cp env.example .env
```

Start the backend:

```sh
python main.py
```

The API server runs at http://localhost:8000. Verify with http://localhost:8000/health.

### Frontend

```sh
cd frontend
npm install
```

Copy the example env file:

```sh
cp env.example .env.local
```

The default `NEXT_PUBLIC_API_URL` points to http://localhost:8000 which is correct for local development.

Start the dev server:

```sh
npm run dev
```

Open http://localhost:3000 in your browser.

---

## Docker Deployment

Build and start both services:

```sh
docker compose up --build
```

The frontend will be available at http://localhost:3000 and the backend at http://localhost:8000.

To run in the background:

```sh
docker compose up --build -d
```

To stop:

```sh
docker compose down
```

---

## Configuration

### Backend Environment Variables

| Variable        | Default                                       | Description                                   |
|-----------------|-----------------------------------------------|-----------------------------------------------|
| HOST            | 0.0.0.0                                       | Bind address                                  |
| PORT            | 8000                                          | Bind port                                     |
| CORS_ORIGINS    | http://localhost:3000,http://127.0.0.1:3000   | Comma-separated allowed origins               |
| RATE_LIMIT_RPM  | 30                                            | Max requests per minute per IP                |
| COOKIES_FILE    | (unset)                                       | Path to cookies.txt for authenticated content |
| PROXY_URL       | (unset)                                       | Proxy URL for yt-dlp (e.g. socks5://...)      |

### Frontend Environment Variables

| Variable             | Default               | Description       |
|----------------------|-----------------------|-------------------|
| NEXT_PUBLIC_API_URL  | http://localhost:8000  | Backend API URL   |

---

## Cookies File

Some sites require authentication for age-restricted or private content. Export your browser cookies in Netscape format to a file named `cookies.txt` and place it in the `backend/` directory. Set the `COOKIES_FILE` environment variable to `./cookies.txt`.

Browser extensions like "Get cookies.txt LOCALLY" can export cookies in the correct format.

---

## API Endpoints

### POST /api/info

Request body:

```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

Returns video metadata and a sorted list of available download formats.

### GET /api/download

Query parameters:
- `url` -- direct format URL to proxy
- `filename` -- desired filename (without extension)
- `ext` -- file extension

Streams the file from the source server to the client. Supports HTTP range requests for resumable downloads.

### GET /health

Returns `{"status": "ok"}`.

---

## Supported Sites

This application supports any site that yt-dlp supports. That includes over 1800 sites. See the full list at https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md.

---

## Notes

- No videos are stored on the server. All downloads are proxied streams.
- Rate limiting is applied per IP address using a sliding window counter.
- This tool is intended for personal use. Respect the copyright and terms of service of content providers.
