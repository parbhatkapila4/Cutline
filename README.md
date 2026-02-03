# CUTLINE

**AI-directed video editing.** One sentence of intent → a 30-45 second edited video. The system decides narrative, shots, pacing, motion, subtitles, voice, and images. No templates, no user config. Images are optional, we fetch from the web (Unsplash/DALL·E/Pexels) using your description, or use a placeholder if APIs fail.

**Tech stack:** Next.js, TypeScript, React 19, Remotion, BullMQ, Redis (ioredis), OpenRouter (AI), ElevenLabs/PlayHT (TTS), Unsplash/Pexels/OpenAI (images), Tailwind CSS.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Remotion](https://img.shields.io/badge/Remotion-4-000?style=flat-square)](https://www.remotion.dev/)
[![BullMQ](https://img.shields.io/badge/BullMQ-5-FF6B6B?style=flat-square)](https://docs.bullmq.io/)
[![Redis](https://img.shields.io/badge/Redis-ioredis-DC382D?style=flat-square&logo=redis)](https://redis.io/)
[![OpenRouter](https://img.shields.io/badge/OpenRouter-AI-000?style=flat-square)](https://openrouter.ai/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)

---

## Overview

Creating short-form video today means writing scripts, picking templates, sourcing B-roll, and editing by hand. By the time you’re done, the idea has aged and the format feels generic.

CUTLINE adds an **AI director layer**. You give one sentence of intent (e.g. “Explain why coffee makes you feel awake in 30 seconds”). The system infers audience, goal, and tone; plans a narrative arc; breaks it into shots; writes the script; generates voice and subtitles; sources or generates images; and composes a finished MP4. No templates, no storyboards, every video is directed from intent. Optional asset uploads (logo, product photos, brand colors) enrich the pipeline; the system still owns all creative decisions.

---

## Core Capabilities:

---

### Intent Interpretation

The pipeline starts by parsing your single sentence into a structured intent: **audience**, **goal**, **tone**, **complexity**, and **duration**. Ambiguity is resolved by the system. This representation drives every downstream stage.

**Test:** `POST /api/intent` with `{ "input": "Explain why coffee makes you feel awake in 30 seconds" }` → `{ audience, goal, tone, complexity, durationSeconds, rawInput }`.

---

### Narrative Planning

From the intent, the system produces a **narrative plan**: arc, 3-5 beats, pacing. No user-facing storyboard, this is an internal representation that drives shot and script decisions.

---

### Shot-Level Reasoning

For each narrative beat, the system decides: what the shot represents (concept, example, transition), how long it holds, and how it relates to adjacent shots. Shot-level reasoning respects pacing (faster cuts for energy, longer holds for explanation) and maintains continuity. No templates; each shot is chosen for this video.

---

### Script and Subtitles

The system generates **spoken copy** aligned to shot boundaries. Script is passed to TTS (ElevenLabs or PlayHT) and to the subtitle stage. Subtitles are chunked and timed; when TTS returns **word-level timings**, the pipeline refines the subtitle track so chunks align to actual spoken words, subtitles appear and disappear in sync with the voice.

**Refinement:** `POST /api/subtitles/refine` with `{ subtitleTrack, wordTimings?, script, shotList }` returns the refined track.

---

### Motion and Visuals

**Motion** specifies how each shot is composed and animated (scale, pan, zoom). **Visuals** specify colors and layout from intent and optional analyzed assets. Both are computed in-process from the shot list and intent; no user config.

---

### Image Sourcing

Every shot gets an image (URL or path). The pipeline derives a search query or image prompt per shot from intent and script (via OpenRouter). It then tries: **Unsplash** (primary) → **DALL·E 3** (AI fallback) → **Pexels** (alternate stock) → simplified query retry. If all fail, a **placeholder** is used so the video still generates.

**Optional:** User-uploaded product photos can be assigned to shots by matching shot purpose to analyzed suggested shot types.

**Test:** `POST /api/images/source` with `{ intent, shotList, script, analyzedAssets?, assetPaths? }` → `ImageSpec` (per-shot `shotId`, `imageUrl`, `source`, `fallbackUsed`).

---

### Optional Asset Upload and Analysis

You can upload **logo**, **product photos**, **reference video/images**, and **brand colors** (hex). Assets are stored; IDs and brand colors are passed into the job. When present, the pipeline runs **asset analysis** (OpenRouter vision) before the visual stage:

- **Logo:** Dominant colors, aspect ratio, transparency, suggested placement (`outro` | `watermark` | `hero`).
- **Product photos:** Dominant colors, aspect ratio, subject description, suggested shot types.
- **Reference video:** Keyframes extracted (ffmpeg); vision analyzes color palette; optional cuts-per-minute.
- **Reference images:** Color palette, mood/style description.
- **Brand colors:** Pass-through (hex validated).

Analysis output is passed to the visual layer and image sourcing. Logo placement is applied in the Remotion composition (watermark, outro, hero).

**Test:** `POST /api/assets/analyze` with `{ assetIds, brandColors? }` → `AnalyzedAssets`.

---

### Video Rendering

The final stage takes the locked narrative plan, shot list, script, subtitles, motion spec, visual spec, **image spec**, and TTS audio and produces a single MP4 via **Remotion**. Output is written to `public/temp/[jobId].mp4` and served at `/temp/[jobId].mp4`. Cleanup runs automatically (configurable retention).

---

### Async Job Queue

Video generation runs in the background so the UI doesn’t block. **Redis is required.**

1. **Submit:** User enters one sentence (and optional assets) on `/generate` → **POST /api/generate** creates a BullMQ job, returns `jobId`.
2. **Worker:** A separate process (`npm run worker`) picks up the job and runs the full pipeline (Intent → Narrative → Shots → Script → Subtitles → TTS → Subtitle refine → Motion → Asset analysis → Visuals → Image sourcing → Remotion render).
3. **Poll:** UI calls **GET /api/generate/[jobId]** until `status` is `completed` or `failed`; then shows video or error.

Rendered videos are written to `public/temp/[jobId].mp4`. Cleanup (repeatable BullMQ job when worker is running) deletes old temp videos, uploads, and per-job images.

---

### Video duration (10–90 seconds)

You can choose a video length between 10 and 90 seconds on the main page. The value is sent as `durationSeconds` in **POST /api/generate** and used for both **Slideshow** and **Talking object** modes. For **Talking object**, videos longer than 8 seconds are built by generating multiple Veo clips (~8s each) and concatenating them. That concatenation step requires **ffmpeg** (on PATH or set `FFMPEG_PATH` in `.env.local`). If ffmpeg is not available and you request a talking_object video over 8 seconds, the job will fail with a clear message.

---

## Architecture

```
+-------------------------------------------------------------------+
|  PRESENTATION                                                     |
|  Next.js 16 · React 19 · Tailwind CSS · /generate · /test         |
+-------------------------------------------------------------------+
                                    |
+-------------------------------------------------------------------+
|  APPLICATION                                                      |
|  API Routes · Rate limiting · Validation · Asset upload           |
+-------------------------------------------------------------------+
                                    |
+-------------------------------------------------------------------+
|  PIPELINE (worker process)                                        |
|  Intent → Narrative → Shots → Script → Subtitles → TTS            |
|  → Subtitle refine → Motion → Asset analysis → Visuals            |
|  → Image sourcing → Remotion render → MP4                         |
+-------------------------------------------------------------------+
                                    |
+---------------------------------------------------------------------+
|  SERVICES                                                           |
|  +------------------+  +------------------+  +------------------+   |
|  | AI (OpenRouter)  |  | TTS              |  | Images           |   |
|  | Intent, Narrative|  | ElevenLabs       |  | Unsplash, Pexels |   |
|  | Shots, Script    |  | PlayHT           |  | DALL·E 3         |   |
|  +------------------+  +------------------+  +------------------+   |
|  BullMQ (Redis) · Remotion · Local / S3 storage                     |
+---------------------------------------------------------------------+
```

**Pipeline flow (worker):**

```
Input (one sentence + optional assetIds, brandColors)
    ↓
1. Intent        — LLM: audience, goal, tone, complexity, duration
    ↓
2. Narrative     — LLM: arc, 3–5 beats, pacing
    ↓
3. Shots         — LLM: 8–12 shots, purpose, motion, text density
    ↓
4. Script        — LLM: spoken text (or silence) per shot
    ↓
5. Subtitles     — In-process: chunk script, estimate timing
    ↓
6. TTS           — ElevenLabs/PlayHT: audio per segment, silence where text is null
    ↓
7. Subtitle refine — Word timings from TTS → align subtitle chunks
    ↓
8. Motion        — In-process: motion spec per shot
    ↓
9. Asset analysis — If uploads: LLM vision on logo, product photos, ref video/images
    ↓
10. Visuals      — In-process: visual spec from intent + assets
    ↓
11. Image sourcing — Per shot: LLM query → Unsplash → DALL·E → Pexels → placeholder
    ↓
12. Remotion render — Compose script, shots, subtitles, motion, images, audio → MP4
    ↓
Output: public/temp/[jobId].mp4
```

---

## Technology Decisions

| Component         | Choice                        | Rationale                                                                                                           |
| ----------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Framework         | Next.js 16                    | App Router, API routes, Vercel-ready; no server-side render of video                                                |
| Language          | TypeScript 5                  | Type safety, clear contracts for pipeline stages and API                                                            |
| Video composition | Remotion 4                    | Programmatic video from React; same stack as app; deterministic render                                              |
| Job queue         | BullMQ + Redis                | Reliable async jobs; repeatable cleanup; same Redis for rate limiting                                               |
| AI                | OpenRouter                    | Single API for multiple models (Gemini, Claude, GPT); intent, narrative, shots, script, image query, asset analysis |
| TTS               | ElevenLabs / PlayHT           | High-quality voice; PCM (ElevenLabs) for silence stitching; configurable                                            |
| Images            | Unsplash, Pexels, DALL·E 3    | Stock first, AI fallback; placeholder if all fail so video still completes                                          |
| Storage           | Local / S3                    | Uploads and temp files; no DB for pipeline state—job state in Redis/BullMQ                                          |
| Rate limiting     | Redis + rate-limiter-flexible | Per-IP limits on generate, upload, status; abuse protection                                                         |
| Testing           | Vitest                        | Unit tests next to source; integration test for POST /api/generate + poll                                           |

---

## Design Philosophy

**One sentence in, video out.** The user provides no script, no storyboard, and no creative knobs at MVP. The system behaves like a director and an editor: it infers intent, plans narrative, chooses shots, writes copy, and sources visuals. That keeps the product simple and the scope bounded.

**No templates.** Every video is directed from intent. Shot list, script, and motion are generated per request, not selected from a library. Repeatability (same intent → same output) is a goal where feasible; randomness in asset selection is minimized or seedable.

**Pipeline over monolith.** The video pipeline is a linear sequence of stages. Each stage consumes the previous output; failures throw and the job is marked failed. Retries (with backoff) apply to transient failures (LLM, TTS, image fetch, Remotion). Clear stage boundaries make it easy to test (e.g. `POST /api/intent`, `POST /api/images/source`) and to swap implementations later.

**Worker separate from app.** Rendering is long-running and CPU-heavy. The Next.js app enqueues jobs and serves the UI; a separate worker process runs the pipeline and writes MP4s. That keeps Vercel/serverless viable for the app and lets the worker run on a beefier host (Railway, Render, Fly.io).

**Images mandatory, sources flexible.** Every shot has an image. If Unsplash, Pexels, and DALL·E all fail, we use a placeholder so the job still completes. No “abstract-only” render mode. Optional asset uploads (logo, product photos, brand colors) enrich the pipeline without requiring them.

**Validation and errors first.** All validation runs before the pipeline starts. Invalid input returns 400 with a clear message. The Generate page displays these messages. Pipeline and worker failures store a user-facing error in the job; the worker does not crash.

---

## Engineering Constraints & Tradeoffs

**Render time vs. interactivity.** Full pipeline (Intent → Render) typically takes 1–3 minutes. We use async jobs and polling so the UI stays responsive. Real-time streaming or “preview in 10s” would require a different architecture (e.g. lower-quality fast path).

**Determinism vs. variety.** Same intent and same system version aim for same output. That simplifies debugging and quality control. Asset selection (e.g. which Unsplash photo) can vary; we don’t guarantee bit-identical reruns.

**Rate limits and cost.** OpenRouter, TTS, and image APIs have rate limits and cost. We rate-limit per IP (e.g. 5 generate/hour, 20 upload/hour) to protect against abuse. Tuning is env-configurable.

**Redis required for async.** The job queue and rate limiting use Redis. Without Redis, you can’t run the async generate flow or rate limiting. There is no in-memory fallback for the queue.

**Cleanup and retention.** Temp videos, uploads, and per-job images are deleted automatically (e.g. 24h retention, hourly cleanup job). That keeps disk bounded. For long-term storage, you’d need to copy outputs to durable storage (S3, CDN) outside CUTLINE.

**No DB.** Pipeline state lives in BullMQ (Redis). There is no PostgreSQL or Prisma. User identity, billing, or project history would require adding a DB and auth in a future iteration.

---

## Run Locally

**Quick start:**

```bash
git clone <repo-url>
cd cutline
npm install
cp .env.example .env.local
```

Edit `.env.local` with required variables (see [Required Environment Variables](#required-environment-variables) below). Then:

```bash
# Terminal 1: Redis (if not already running)
# docker run -d -p 6379:6379 redis   # or redis-server

npx next dev
```

App runs at `http://localhost:3000`. Open `/generate` for video generation, `/test` for pipeline stage testing.

**Worker (required for async video generation):**

```bash
# Terminal 2: same directory, same .env.local
npm run worker
```

Keep the worker running while you use the Generate page. It runs the full pipeline and cleanup.

For full setup (env vars, Redis, Vercel + worker deployment), see **[docs/PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md)**.

---

## Required Environment Variables

```bash
REDIS_URL=redis://localhost:6379
OPENROUTER_API_KEY=sk-or-...
ELEVENLABS_API_KEY=...   # or PLAYHT_API_KEY + PLAYHT_USER_ID with TTS_PROVIDER=playht
UNSPLASH_ACCESS_KEY=...  # or PEXELS_API_KEY (at least one image source)
```

---

## Optional Environment Variables

```bash
# OpenRouter
OPENROUTER_MODEL=google/gemini-2.0-flash-lite-001
OPENROUTER_VISION_MODEL=google/gemini-2.0-flash-lite-001

# TTS
TTS_PROVIDER=elevenlabs
TTS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
ELEVENLABS_USE_MP3=true
PLAYHT_API_KEY=...
PLAYHT_USER_ID=...

# Images
PEXELS_API_KEY=...
OPENAI_API_KEY=...

# Storage (uploads, temp)
STORAGE_TYPE=local
UPLOAD_DIR=uploads
# AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET, AWS_REGION (if STORAGE_TYPE=s3)

# Cleanup
CLEANUP_ENABLED=true
VIDEO_RETENTION_HOURS=24
UPLOAD_RETENTION_HOURS=24
CLEANUP_INTERVAL_HOURS=1
CLEANUP_SECRET=...

# Rate limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_GENERATE=5
RATE_LIMIT_UPLOAD=20
RATE_LIMIT_STATUS=60
RATE_LIMIT_GENERAL=100

# Retry (LLM, TTS, image, render)
RETRY_ENABLED=true
RETRY_LLM_MAX=3
RETRY_TTS_MAX=3
RETRY_IMAGE_MAX=2
RETRY_RENDER_MAX=2
```

**Note:** At least one image source (Unsplash or Pexels) is required for real images; if none are set or all fail, a placeholder is used so the video still generates.

---

## API Reference

### Endpoints

#### Video generation

| Method | Endpoint                | Description                                                                                                                                             |
| ------ | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/generate`         | Create video job. Body: `{ input, assetIds?, brandColors?, mode? }`. Returns `{ jobId }`. Rate limited (e.g. 5/hour per IP).                            |
| GET    | `/api/generate/[jobId]` | Job status. Returns `{ status, videoUrl?, error? }`. `status`: `pending` \| `processing` \| `completed` \| `failed`. Rate limited (e.g. 60/min per IP). |

#### Pipeline stages (test in isolation)

| Method | Endpoint                | Description                                                                                    |
| ------ | ----------------------- | ---------------------------------------------------------------------------------------------- |
| POST   | `/api/intent`           | Intent from one sentence. Body: `{ input }`.                                                   |
| POST   | `/api/narrative`        | Narrative plan from intent. Body: `{ intent }`.                                                |
| POST   | `/api/shots`            | Shot list from narrative + intent. Body: `{ narrative, intent }`.                              |
| POST   | `/api/script`           | Script from shots + narrative. Body: `{ shots, narrative, intent }`.                           |
| POST   | `/api/subtitles`        | Subtitle track from script + shots. Body: `{ script, shotList }`.                              |
| POST   | `/api/subtitles/refine` | Refine subtitles with word timings. Body: `{ subtitleTrack, wordTimings?, script, shotList }`. |
| POST   | `/api/tts`              | TTS audio from script + shot list. Body: `{ script, shotList }`.                               |
| POST   | `/api/motion`           | Motion spec from shot list. Body: `{ shotList }`.                                              |
| POST   | `/api/visuals`          | Visual spec from intent + optional assets. Body: `{ intent, analyzedAssets? }`.                |
| POST   | `/api/images/source`    | Image spec per shot. Body: `{ intent, shotList, script, analyzedAssets?, assetPaths? }`.       |
| POST   | `/api/render`           | Remotion render to MP4. Body: full pipeline payload + imageSpec, optional audioBase64.         |

#### Assets

| Method | Endpoint                | Description                                                                                                           |
| ------ | ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/assets/upload`    | Upload logo, product photos, reference video/images. Returns `{ assetIds, ... }`. Rate limited (e.g. 20/hour per IP). |
| GET    | `/api/assets/[assetId]` | Get asset (redirect or URL).                                                                                          |
| POST   | `/api/assets/analyze`   | Analyze uploaded assets + brand colors. Body: `{ assetIds, brandColors? }`. Returns `AnalyzedAssets`.                 |

#### Operations

| Method | Endpoint       | Description                                                                                                         |
| ------ | -------------- | ------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/cleanup` | Manual cleanup (temp videos, uploads, per-job images). Optional header: `X-Cleanup-Secret` if `CLEANUP_SECRET` set. |

---

### Example: Create job and poll

**Create job:**

```bash
curl -X POST "http://localhost:3000/api/generate" \
  -H "Content-Type: application/json" \
  -d '{"input": "Explain why coffee makes you feel awake in 30 seconds"}'
```

**Response:**

```json
{
  "jobId": "abc123..."
}
```

**Poll status:**

```bash
curl "http://localhost:3000/api/generate/abc123..."
```

**Response (completed):**

```json
{
  "status": "completed",
  "videoUrl": "/temp/abc123....mp4"
}
```

**Response (failed):**

```json
{
  "status": "failed",
  "error": "TTS failed after 3 retries."
}
```

---

### Example: Intent only

```bash
curl -X POST "http://localhost:3000/api/intent" \
  -H "Content-Type: application/json" \
  -d '{"input": "Explain why coffee makes you feel awake in 30 seconds"}'
```

**Response:**

```json
{
  "audience": "general",
  "goal": "explain",
  "tone": "informative",
  "complexity": "simple",
  "durationSeconds": 30,
  "rawInput": "Explain why coffee makes you feel awake in 30 seconds"
}
```

---

### Input validation and errors

| Constraint                | Behavior | Example message                                                                     |
| ------------------------- | -------- | ----------------------------------------------------------------------------------- |
| Empty input               | 400      | `Input cannot be empty.`                                                            |
| Too short (< 5 chars)     | 400      | `Input is too short. Please describe what you want in a sentence.`                  |
| Too long (> 500 chars)    | 400      | `Input is too long. Keep it to one sentence.`                                       |
| Prompt-injection patterns | 400      | `Input contains invalid instructions. Please describe what you want in a sentence.` |
| Invalid job ID            | 400      | `Invalid job ID.`                                                                   |
| Job not found             | 404      | `Job not found.`                                                                    |
| Rate limit exceeded       | 429      | `Too many requests. Please try again later.` + `Retry-After`                        |

Asset upload validation (file type, size, count) is documented in the existing README sections and implemented in `src/lib/assets/validation.ts`.

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── assets/
│   │   │   ├── [assetId]/     # GET asset
│   │   │   ├── analyze/       # POST analyze assets
│   │   │   └── upload/        # POST upload
│   │   ├── cleanup/           # POST manual cleanup
│   │   ├── generate/
│   │   │   ├── [jobId]/       # GET job status
│   │   │   └── route.ts       # POST create job
│   │   ├── images/source/     # POST image spec per shot
│   │   ├── intent/            # POST intent
│   │   ├── motion/            # POST motion spec
│   │   ├── narrative/        # POST narrative
│   │   ├── render/            # POST Remotion render
│   │   ├── script/            # POST script
│   │   ├── shots/             # POST shot list
│   │   ├── subtitles/
│   │   │   ├── refine/        # POST refine subtitles
│   │   │   └── route.ts       # POST subtitles
│   │   ├── tts/               # POST TTS
│   │   └── visuals/           # POST visual spec
│   ├── generate/              # Generate page (UI)
│   ├── test/                  # Pipeline test page
│   ├── page.tsx               # Landing
│   └── layout.tsx
├── components/
│   ├── GenerateFlow.tsx
│   ├── Hero.tsx
│   ├── HowItWorks.tsx
│   └── ...
├── lib/
│   ├── assets/                # Storage, analysis, validation, types
│   ├── images/                # Unsplash, Pexels, DALL·E, source.ts
│   ├── pipeline/              # Orchestrator, intent, narrative, shots, script, subtitles, tts, motion, visuals, renderVideo
│   ├── queue/                 # BullMQ videoQueue
│   ├── rate-limit.ts
│   ├── storage/               # Cleanup
│   ├── tts/                   # WAV utils
│   ├── types/                 # Intent, narrative, shots, script, subtitles, tts, motion, visuals
│   ├── utils/                 # retry, error
│   ├── validation/            # input.ts
│   └── veo/                   # (future) video generation
├── remotion/
│   ├── CUTLINEComposition.tsx
│   ├── components/            # ImageBackground, SubtitleOverlay, MotionLayer, LogoOverlay, ...
│   ├── index.tsx
│   └── Root.tsx
└── worker.ts                  # BullMQ worker entry
```

---

## Testing

| Command                 | Description                     |
| ----------------------- | ------------------------------- |
| `npm run test`          | Vitest watch mode               |
| `npm run test:run`      | Unit tests (CI)                 |
| `npm run test:coverage` | Coverage report (if configured) |

Unit tests live next to source (`*.test.ts`). Integration test: `src/app/api/generate/generate.integration.test.ts` (POST /api/generate + poll until completed/failed). It is skipped when `REDIS_URL` is not set. Run `npm run dev` and `npm run worker` separately if you want the integration test to reach completion.

---

## Deployment

### Vercel + worker

- **Vercel:** Deploy the Next.js app (API routes + UI). Set env vars in the Vercel dashboard. API routes handle: create job, poll job status, asset upload. No video rendering on Vercel.
- **Worker + Redis:** Run the worker and Redis on a separate service (e.g. [Railway](https://railway.app), [Render](https://render.com), [Fly.io](https://fly.io)):
  - Provision Redis (or use [Upstash](https://upstash.com) and set `REDIS_URL` with ioredis-compatible URL).
  - Run `npm run worker` as a long-running process.
  - Use the same env vars as the app (OpenRouter, TTS, image keys, `REDIS_URL`).
- **Storage:** For uploads and temp files, use local disk on the worker host or set `STORAGE_TYPE=s3` and configure AWS. Vercel serverless has no persistent disk.

### All-in-one

Deploy Next.js and the worker on the same host (e.g. Railway, Render): run `npm run build && npm run start` for the app and `npm run worker` in a second process. Both must use the same Redis.

See **[docs/PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md)** before going live.

---

## Security

- **Input validation:** All text and asset input validated before the pipeline (Zod/validation modules). Prompt-injection patterns rejected.
- **Rate limiting:** Redis-backed per-IP limits on generate, upload, and status to reduce abuse and runaway cost.
- **Cleanup:** Optional `CLEANUP_SECRET` to restrict manual `POST /api/cleanup` to authorized callers.
- **No auth at MVP.** API routes are public. For production with multiple users, add authentication (e.g. Clerk, NextAuth) and scope jobs/assets by user.
- **Secrets:** API keys and secrets only in env; never logged or returned in responses.

---

## Scripts (package.json)

| Script                    | Purpose                                                                    |
| ------------------------- | -------------------------------------------------------------------------- |
| `npm run dev`             | Next.js dev server (UI + API).                                             |
| `npm run build`           | Next.js production build.                                                  |
| `npm run start`           | Next.js production server.                                                 |
| `npm run worker`          | BullMQ worker (separate process). Runs pipeline + cleanup; requires Redis. |
| `npm run remotion:studio` | Remotion studio for composition preview.                                   |
| `npm run remotion:render` | Remotion CLI render with default props.                                    |
| `npm run test`            | Vitest watch mode.                                                         |
| `npm run test:run`        | Vitest single run (CI).                                                    |
| `npm run lint`            | ESLint.                                                                    |

---

## Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)** — Pipeline flow, job queue, key modules, storage, data flow.
- **[docs/FEATURE_SPEC.md](docs/FEATURE_SPEC.md)** — Core principle, user experience, capabilities, non-goals, future extensions.
- **[docs/PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md)** — Env, worker, Redis, API keys, rate limiting, cleanup, smoke test.
- **[docs/IMAGE_API_KEYS.md](docs/IMAGE_API_KEYS.md)** — Image API keys and setup (if present).

---

## Limitations

- **Rate limits:** App and provider rate limits apply. Default: 5 generate/hour, 20 upload/hour per IP.
- **Retention:** Rendered videos and uploads cleaned automatically (default 24h). Configure `VIDEO_RETENTION_HOURS`, `UPLOAD_RETENTION_HOURS`.
- **Render time:** Full pipeline typically 1–3 minutes depending on length and image sourcing.
- **Worker required:** Async video generation needs the worker process and Redis; Vercel alone cannot run the pipeline.
- **No auth:** API is public at MVP; add auth and user-scoped jobs for multi-tenant production.

---

## If Running at Scale

- **Worker scaling:** Run multiple worker processes (same Redis queue) for higher throughput. Ensure storage (temp/output) is shared or per-worker and cleanup accounts for it.
- **Redis:** Use a managed Redis (Upstash, Redis Cloud) with persistence. Monitor queue depth and job failure rate.
- **Storage:** Use S3 (or equivalent) for uploads and consider moving rendered MP4s to a CDN or durable bucket; cleanup can then focus on temp dirs only.
- **Rate limiting:** Keep Redis-backed limits; consider stricter tiers or per-user limits if you add auth.
- **Observability:** Log pipeline stage duration and failure reasons; add metrics (e.g. job completed/failed per hour, TTS/LLM latency) for tuning and alerting.
- **Cost:** OpenRouter, TTS, and image APIs dominate cost. Cap context size and image resolution where possible; monitor usage per job.

---

## Contributing

We welcome contributions. Before submitting a pull request:

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/my-feature`).
3. Commit your changes (`git commit -m 'Add my feature'`).
4. Push to the branch (`git push origin feature/my-feature`).
5. Open a Pull Request.

Run `npm run test:run` and `npm run lint` before submitting.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details (if present).

---

<div align="center">
  <br />
  <p>
    <sub>
      Built with precision by <a href="https://github.com/parbhatkapila4"><strong>Parbhat Kapila</strong></a>
    </sub>
  </p>
  <p>
    <a href="https://twitter.com/parbhatkapila4">Twitter</a>
    ·
    <a href="https://linkedin.com/in/parbhat-kapila">LinkedIn</a>
    ·
    <a href="https://github.com/parbhatkapila4">GitHub</a>
  </p>
  <br />
  <p>
    <sub>If CUTLINE helped you, consider giving it a star.</sub>
  </p>
  <p>
    <a href="https://github.com/parbhatkapila4/cutline">
      <img src="https://img.shields.io/github/stars/parbhatkapila4/cutline?style=social" alt="Star on GitHub" />
    </a>
  </p>
</div>
