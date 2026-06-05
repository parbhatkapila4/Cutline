# Deploying the render worker

## Why this exists

Cutline is **two services that share one Redis**:

| Service | Runs on | Job |
|---|---|---|
| Next.js app | Vercel | UI + API; **enqueues** generation jobs |
| Render worker | a long-running host | **drains** the queue, renders the MP4 |

`POST /api/generate` only puts a job into Redis. A separate worker process
(`npm run worker`) must pick it up and run the 12-stage pipeline. **If no worker
is running, every job sits at "Analyzing prompt" forever** — there is no
in-process fallback.

> If videos generate while you're developing but hang in production, it's almost
> always because your **local** `npm run worker` was the only worker, draining
> the shared Redis. Close it and prod has no worker. The fix is to deploy one.

The app now reports worker liveness: when the worker is offline, the create
screen shows **"Render worker offline"** instead of a perpetual spinner. That
banner means *deploy/restart the worker* — not that anything is wrong with the
prompt.

## What the worker needs

- **Node 22**, **ffmpeg** on PATH, and **Chrome Headless Shell** + its system
  libraries (for Remotion). `Dockerfile.worker` installs all of these.
- **The same `REDIS_URL` as the Vercel app.** This is the #1 thing people get
  wrong. App and worker on different Redis instances = jobs never drained.
- ~2 GB RAM minimum (4 GB comfortable) — Remotion launches headless Chrome.

## Deploy on Railway (recommended)

1. **New Project → Deploy from GitHub repo**, pick this repo.
2. In the service **Settings → Build**, set **Dockerfile Path** = `Dockerfile.worker`.
   (Railway builds the image; the image's `CMD` already runs `npm run worker` —
   no custom start command needed.)
3. **Variables**: add every env var from the checklist below. Copy `REDIS_URL`
   **verbatim from your Vercel project** so both point at the same Redis.
4. **Deploy.** Watch the logs for:
   ```
   [worker] Video generation worker started. Queue: video-generation
   ```
   If you instead see `[config] Startup validation failed: Missing required
   environment variables: …`, a required var is missing — add it and redeploy.
5. Open the app and create a video. It should now advance past "Analyzing
   prompt." Any job that was stuck while the worker was down will drain
   immediately.

### Render / Fly.io

Same idea, Dockerfile-based:

- **Render** → New **Background Worker** → Docker, Dockerfile path
  `Dockerfile.worker`, add the env vars.
- **Fly.io** → `fly launch --dockerfile Dockerfile.worker --no-deploy`, set
  secrets with `fly secrets set KEY=value …`, then `fly deploy`. Keep at least
  one machine running (don't scale to zero — a sleeping worker = stuck jobs).

## Environment variable checklist

**Required (worker won't start without these):**

| Var | Notes |
|---|---|
| `REDIS_URL` | **Must match the Vercel app exactly.** |
| `OPENROUTER_API_KEY` | LLM stages (intent, script, …). |
| `ELEVENLABS_API_KEY` | Required when `TTS_PROVIDER=elevenlabs` (default). |
| `PLAYHT_API_KEY`, `PLAYHT_USER_ID` | Required instead, if `TTS_PROVIDER=playht`. |

**Strongly recommended (features silently degrade without them):**

| Var | Notes |
|---|---|
| `DATABASE_URL` | Token deduction + usage/billing recorded on job completion. |
| `BLOB_READ_WRITE_TOKEN` | Upload finished MP4s to Vercel Blob so the app can serve them. Same token as the Vercel app. See `docs/PRODUCTION_CHECKLIST.md`. |
| `GEMINI_API_KEY` | VEO / talking-cartoon paths. |
| `HEYGEN_API_KEY` | Talking-real (studio avatar) path. |
| `UNSPLASH_ACCESS_KEY`, `PEXELS_API_KEY`, `OPENAI_API_KEY` | Image sourcing chain. Without them, slideshows fall back to placeholder visuals. |

**Optional tuning:** `TTS_VOICE_ID`, `ELEVENLABS_USE_MP3`, `MAX_VIDEO_DURATION_SECONDS`,
`MAX_VIDEO_OUTPUT_MB`, `CLEANUP_ENABLED`, `VIDEO_RETENTION_HOURS`,
`UPLOAD_RETENTION_HOURS`, `CLEANUP_INTERVAL_HOURS`, `JOB_RETENTION_DAYS`,
`CLEANUP_EXPIRED_HOURS`, `RETRY_*`, `FFMPEG_PATH` (unset = use the image's ffmpeg).

## Important: pair this with Blob storage

Deploying the worker fixes **generation**. For finished videos to actually be
**viewable** (thumbnails, player, download), the worker must also upload outputs
to Vercel Blob — the worker's local `public/temp` is unreachable from the Vercel
app. Make sure `BLOB_READ_WRITE_TOKEN` is set on **both** services and that the
Blob-upload code is deployed. Otherwise generation completes but playback 404s.
