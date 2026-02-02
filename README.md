# CUTLINE

**AI-directed video editing.** One sentence of intent → a 30–45 second edited video. The system decides narrative, shots, pacing, motion, subtitles, voice, and images. No templates, no user config. Images are optional—we fetch from the web (Unsplash/DALL·E/Pexels) using your description, or use a placeholder if APIs fail.

---

## Prerequisites

- **Node.js** 18+
- **Redis** (for job queue; local or managed)
- **API keys:** OpenRouter (LLM), TTS (ElevenLabs or PlayHT), at least one image source (Unsplash or Pexels). See [API keys](#api-keys) below.

---

## Local setup

1. **Clone and install**
   ```bash
   git clone <repo-url>
   cd cutline
   npm install
   ```

2. **Environment**
   - Copy `.env.example` to `.env.local`.
   - Fill in API keys (see [API keys](#api-keys)). At minimum: `OPENROUTER_API_KEY`, `REDIS_URL`, TTS key, and one of `UNSPLASH_ACCESS_KEY` or `PEXELS_API_KEY`.

3. **Start Redis**
   - Local: `redis-server` or `docker run -d -p 6379:6379 redis`.
   - Set `REDIS_URL=redis://localhost:6379` in `.env.local`.

4. **Run the app**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) for the landing page; [http://localhost:3000/generate](http://localhost:3000/generate) for video generation.

5. **Run the worker** (required for async video generation)
   In a **separate terminal**, with the same `.env.local`:
   ```bash
   npm run worker
   ```
   Keep it running while you use the Generate page. The worker runs the full pipeline (Intent → Narrative → Shots → Script → Subtitles → TTS → Motion → Visuals → Image sourcing → Remotion render).

### Scripts (package.json)

| Script | Purpose |
|--------|---------|
| `npm run dev` | Next.js dev server (UI + API). |
| `npm run build` | Next.js production build. |
| `npm run start` | Next.js production server. |
| `npm run worker` | BullMQ worker (separate process). Runs pipeline; requires Redis. |
| `npm run remotion:studio` | Remotion studio for composition preview (optional). |
| `npm run remotion:render` | Remotion CLI render with default props (optional, for testing). |
| `npm run test` | Vitest in watch mode (unit + integration). |
| `npm run test:run` | Vitest single run (CI). |

**Tests:** Unit tests live next to source (`*.test.ts`). The integration test in `src/app/api/generate/generate.integration.test.ts` is skipped when `REDIS_URL` is not set; when run, it POSTs to `/api/generate` and polls until the job completes or fails. It does not start the Next.js server or worker—run `npm run dev` and `npm run worker` separately if you want the integration test to reach completion.

---

## API keys

Copy `.env.example` to `.env.local` and set the following. See README sections below for details.

| Variable | Where to get it |
|----------|-----------------|
| **OPENROUTER_API_KEY** | [OpenRouter](https://openrouter.ai) → Keys. Used for Intent, Narrative, Shots, Script, image query derivation, asset analysis. |
| **ELEVENLABS_API_KEY** | [ElevenLabs](https://elevenlabs.io/app/settings/api-keys) → API Key. Default TTS provider. |
| **PLAYHT_API_KEY**, **PLAYHT_USER_ID** | [PlayHT](https://play.ht/app/account/api-access). Only if `TTS_PROVIDER=playht`. |
| **UNSPLASH_ACCESS_KEY** | [Unsplash OAuth Apps](https://unsplash.com/oauth/applications). Primary stock images. |
| **PEXELS_API_KEY** | [Pexels API](https://www.pexels.com/api/). Fallback stock images. |
| **OPENAI_API_KEY** | [OpenAI API keys](https://platform.openai.com/api-keys). Used for DALL·E 3 when stock fails. |
| **REDIS_URL** | Local: `redis://localhost:6379`. Production: e.g. [Upstash](https://upstash.com) (Redis Connect → ioredis URL). |
| **AWS_*** | Only if `STORAGE_TYPE=s3`. [AWS Console](https://aws.amazon.com/console/). |

Set at least one image source (Unsplash or Pexels) for real images; if none are set or all fail, a placeholder is used so the video still generates.

---

## Deployment

CUTLINE has two parts: **Next.js (API + UI)** and **worker (BullMQ + Remotion)**. Remotion render is long-running and needs a Node process; it cannot run on Vercel serverless.

### Recommended: Vercel + separate worker

- **Vercel:** Deploy the Next.js app (API routes + UI). A minimal `vercel.json` is included. Set all env vars in Vercel project settings. API routes handle: create job, poll job status, asset upload. No video rendering on Vercel.
- **Worker + Redis:** Run the worker and Redis on a separate service (e.g. [Railway](https://railway.app), [Render](https://render.com), [Fly.io](https://fly.io)):
  - Provision Redis (or use Upstash and set `REDIS_URL`).
  - Run `npm run worker` as a long-running process (Railway/Render “background worker”, Fly.io “app”).
  - Use the same env vars as the app (OpenRouter, TTS, image keys, `REDIS_URL`).
- **Storage:** For uploads and temp files, use local disk on the worker host or set `STORAGE_TYPE=s3` and configure AWS. Vercel serverless has no persistent disk, so asset uploads should either go to S3 or be limited to the worker host if you keep uploads only there.

### Alternative: All-in-one

Deploy Next.js and the worker on the same host (e.g. Railway, Render, Fly.io): run `npm run build && npm run start` for the app and `npm run worker` in a second process. Both must use the same Redis.

See [Production checklist](docs/PRODUCTION_CHECKLIST.md) before going live.

---

## Architecture (summary)

1. **User** enters one sentence on `/generate` → **POST /api/generate** creates a job (BullMQ), returns `jobId`.
2. **Worker** (separate process) picks up the job and runs the pipeline: **Intent** → **Narrative** → **Shots** → **Script** → **Subtitles** → **TTS** → **Motion** → **Visuals** → **Image sourcing** → **Remotion render** → writes MP4 to `public/temp/[jobId].mp4`.
3. **UI** polls **GET /api/generate/[jobId]** until status is `completed` or `failed`; then shows video or error.

Details: [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Environment (reference)

1. Copy `.env.example` to `.env.local`. Fill in API keys. See [API keys](#api-keys) and README sections below for where to get them.
2. Required: `OPENROUTER_API_KEY`, `REDIS_URL`, TTS key (e.g. `ELEVENLABS_API_KEY`), and at least one of `UNSPLASH_ACCESS_KEY` or `PEXELS_API_KEY`.

---

## TTS (text-to-speech)

Voice is generated from the script (Stage 4) plus shot list (Stage 3). Silence shots get silent segments; speech shots are sent to the TTS provider. Same script + shot list → same audio (deterministic).

**Configured provider:** Set `TTS_PROVIDER` to `elevenlabs` (default) or `playht`. Then set the matching API key and voice.

**ElevenLabs (default)**  
- Get an API key: [ElevenLabs → Profile → API Key](https://elevenlabs.io/app/settings/api-keys).  
- Add to `.env.local`: `ELEVENLABS_API_KEY=your_key`, `TTS_VOICE_ID=your_voice_id`.  
- Pick a voice: [Voices](https://elevenlabs.io/app/voice-library). Copy the voice ID from the voice URL or API. Default `TTS_VOICE_ID` is Rachel (`21m00Tcm4TlvDq8ikWAM`).  
- PCM output (44.1kHz) is used so silence can be stitched in; Pro tier or above may be required for PCM.

**PlayHT**  
- Get API key and User ID: [PlayHT → Account → API Access](https://play.ht/app/account/api-access).  
- Add to `.env.local`: `TTS_PROVIDER=playht`, `PLAYHT_API_KEY=...`, `PLAYHT_USER_ID=...`, `TTS_VOICE_ID=...`.  
- Silence insertion is not supported with PlayHT (output is speech-only mp3).

**Optional:** `TTS_VOICE_ID` overrides the voice; leave unset to use the provider default.

---

## Subtitle refinement (word timings)

Subtitles are generated from the script with **estimated** timing (Stage 5). When TTS returns **word-level timings** (`wordTimings`: array of `{ word, startMs, endMs }`), the pipeline refines the subtitle track so chunks align to actual spoken words—subtitles appear and disappear in sync with the voice for a hand-edited feel.

- **Refinement:** After TTS, `refineSubtitles(subtitleTrack, ttsResult.wordTimings, script, shotList)` maps each chunk to a run of words in `wordTimings` and sets `startMs`/`endMs` from the first and last word. Chunks stay in order; overlap is removed.
- **Fallback:** If `wordTimings` is missing, empty, or alignment fails (e.g. chunk word count exceeds available words), the original estimated track is returned; no throw. Log a warning.
- **Deterministic:** Same inputs → same refined track.
- **Test in isolation:** `POST /api/subtitles/refine` with body `{ subtitleTrack, wordTimings?, script, shotList }` returns the refined track (same structure as SubtitleTrack).

---

## Job queue (async video generation)

Video generation runs in the background so the UI doesn’t block. **Redis is required** for the job queue.

### Redis

- **Local:** Install Redis and run `redis-server`, or use [Docker](https://www.docker.com/): `docker run -d -p 6379:6379 redis`.
- Add to `.env.local`: `REDIS_URL=redis://localhost:6379` (or your Redis host/port).

### Worker

The worker runs the full pipeline (Intent → Narrative → Shots → Script → Subtitles → TTS → Motion → Visuals → Remotion render). Start it in a separate terminal:

```bash
npm run worker
```

Keep it running while you use the async generate flow. It needs the same env vars as the app (OpenRouter, TTS, etc.).

### Async flow

1. **Submit:** Open [http://localhost:3000/generate](http://localhost:3000/generate), enter one sentence, click **Generate video**.
2. **Job created:** The app calls `POST /api/generate` with `{ input: string }` and gets back `{ jobId: string }`.
3. **Poll:** The UI polls `GET /api/generate/[jobId]` every 2–3 seconds.
4. **Status:** You see **Queued** → **Processing…** → **Completed** (video player + download link) or **Failed** (error message).

Rendered videos are written to `public/temp/[jobId].mp4` and served at `/temp/[jobId].mp4`. Cleanup runs automatically with the worker (see **File storage and cleanup** below).

---

## Input validation and error messages

All validation runs **before** the pipeline starts. Invalid input returns **400** with a clear message in `{ error: string }`. The Generate page displays these messages to the user.

### Text input (one sentence)

| Constraint | Behavior | Error message |
|------------|----------|---------------|
| Empty or whitespace-only | Reject | `Input cannot be empty.` |
| Too short (< 5 characters) | Reject | `Input is too short. Please describe what you want in a sentence.` |
| Too long (> 500 characters) | Reject | `Input is too long. Keep it to one sentence.` |
| Control characters / null bytes | Stripped before use | — |
| Prompt-injection patterns | Reject | `Input contains invalid instructions. Please describe what you want in a sentence.` |
| Unicode (emoji, non-Latin) | Allowed | — |

Validation is implemented in `src/lib/validation/input.ts` (`validateInput`, `sanitizeInput`). Used by `POST /api/generate`.

### Asset uploads

| Constraint | Behavior | Error message |
|------------|----------|---------------|
| File type | Only PNG, JPG, JPEG, SVG, MP4, MOV | `Invalid file type: [type]. Allowed: PNG, JPG, SVG, MP4, MOV.` |
| File size | Logo 2MB, product/reference images 2MB each, reference video 20MB | `File too large: [filename]. Max size: [limit].` |
| File count | 1 logo, 5 product photos, 1 reference video, 3 reference images | `Too many files for [type].` |
| Corrupt / invalid file | Buffer fails magic-byte or format check | `Invalid or corrupt file: [filename].` |

Implemented in `src/lib/assets/validation.ts`. Used by `POST /api/assets/upload`.

### Brand colors

- **Format:** Hex only (`#RRGGBB` or `#RGB`). Invalid format → 400: `Invalid brand color format. Use hex (e.g. #FF0000).`
- **Optional:** `primary` and `secondary` are both optional; if omitted, no brand colors are sent.

### Job status (GET /api/generate/[jobId])

- **Job ID format:** UUID (with or without hyphens) or alphanumeric string, 1–64 chars. Invalid → 400: `Invalid job ID.`
- **Job not found:** 404: `Job not found.`
- **Job still processing:** 200 with `status: "processing"` (no error).
- **Job failed:** 200 with `status: "failed"` and `error: string` (message from pipeline/worker).
- **Job completed:** 200 with `status: "completed"` and `videoUrl`.

### Pipeline and worker failures

- If any pipeline stage throws (LLM timeout, TTS error, image fetch fail, Remotion render fail), the worker catches the error, marks the job as **failed**, and stores the error message in the job. The worker process does not crash.
- When the user polls, they get `status: "failed"` and the stored `error` message.
- Jobs are never left stuck in `"processing"`; they end in either `completed` or `failed`.

---

## Pipeline retry logic

External calls (LLM, TTS, image fetch, Remotion render) can fail transiently (timeout, rate limit, network). The pipeline wraps these with **retry and exponential backoff**. Permanent failures (e.g. 400, 401, 403) are not retried.

### What is retried

| Call type | Retry on | Don't retry on | Max retries | Backoff |
|-----------|----------|----------------|-------------|---------|
| **LLM** (Intent, Narrative, Shots, Script, Image query, Asset analysis) | 429, 408, 504, 5xx, timeout, network | 400, 401, 403 | 3 | 1s, 2s, 4s |
| **TTS** (ElevenLabs, PlayHT) | 429, 5xx, timeout, network | 400, 401, 403 | 3 | 2s, 4s, 8s |
| **Image fetch** (Unsplash, Pexels, DALL·E) | 429, 5xx, timeout, network | 404, 400, 401 | 2 (per source) | 1s, 2s |
| **Remotion render** | Timeout, render crash | Invalid composition, missing props | 2 | 5s, 10s |

After all retries fail, the stage throws with a clear message (e.g. *"… Failed after N retries."*); the job is marked failed and the user sees the error when polling.

### Configuration

- **`RETRY_ENABLED`** — `true` (default) or `false`. Set to `false` to disable all retries (useful for local debugging).
- **`RETRY_LLM_MAX`** — max retries for LLM calls (default `3`).
- **`RETRY_TTS_MAX`** — max retries for TTS calls (default `3`).
- **`RETRY_IMAGE_MAX`** — max retries per image source (default `2`).
- **`RETRY_RENDER_MAX`** — max retries for Remotion render (default `2`).

Retries are logged: *"Retrying [label] (attempt 2/3) after Nms. Error: …"* so you can see transient failures in logs.

Implementation: `src/lib/utils/retry.ts` (`retry()`, `getRetryConfig()`, `shouldRetryForLLM`, `shouldRetryForTTS`, `shouldRetryForImage`, `shouldRetryForRender`). Used by the orchestrator and image sourcing.

---

## Rate limiting

Public API routes are rate limited per client (IP) to protect against abuse and runaway costs. Limits use the same Redis instance as the job queue.

### Limits per endpoint

| Endpoint | Default limit | Window |
|----------|----------------|--------|
| `POST /api/generate` | 5 requests | per hour |
| `POST /api/assets/upload` | 20 requests | per hour |
| `GET /api/generate/[jobId]` | 60 requests | per minute |
| Other public routes | 100 requests | per minute (use `checkRateLimit(identifier, 'general')` in route) |

Client is identified by `x-forwarded-for` (first IP), `x-real-ip`, or `"anonymous"` as fallback.

### Response on limit exceeded (429)

- **Status:** 429 Too Many Requests  
- **Body:** `{ error: "Too many requests. Please try again later.", retryAfter: number }`  
- **Header:** `Retry-After: <seconds>`

The Generate page shows: *"Too many requests. Please try again in X minute(s)."* and does not retry automatically.

### Configuration

- `RATE_LIMIT_ENABLED` — `true` (default) or `false`. Set to `false` for local dev to disable all rate limiting.
- `RATE_LIMIT_GENERATE` — requests per hour for `POST /api/generate` (default `5`).
- `RATE_LIMIT_UPLOAD` — requests per hour for `POST /api/assets/upload` (default `20`).
- `RATE_LIMIT_STATUS` — requests per minute for `GET /api/generate/[jobId]` (default `60`).
- `RATE_LIMIT_GENERAL` — requests per minute for other protected routes (default `100`).

To protect additional routes, call `checkRateLimit(getClientIdentifier(request), 'general')` at the start of the handler and return 429 with `Retry-After` when `allowed === false`.

---

## Optional: Asset upload and storage

You can optionally upload assets (logo, product photos, reference video/images, brand colors) when generating a video. Assets are stored and their IDs are passed into the job; **the pipeline does not use them yet**—asset-aware rendering will be added in a later prompt. This feature is upload + storage only.

### Supported formats and limits

| Asset type        | Format              | Limit                          |
|-------------------|---------------------|--------------------------------|
| Logo              | PNG, SVG, JPG       | 1 file, 2MB                    |
| Product photos    | PNG, JPG            | Up to 5 files, 2MB each        |
| Reference video   | MP4, MOV            | 1 file, 30s max, 20MB          |
| Reference images  | PNG, JPG            | Up to 3 files, 2MB each        |
| Brand colors      | Text (hex)          | Primary required, secondary optional |

Brand colors are not uploaded as files; use hex codes (e.g. `#ff0000` or `ff0000`) in the UI or in the request body as `brandColors: { primary: string, secondary?: string }`.

### Storage

- **Local (default):** Set `STORAGE_TYPE=local` and `UPLOAD_DIR=uploads` in `.env.local`. Files are stored under `uploads/` (by job/session). Add `uploads/` to `.gitignore` (already present).
- **S3:** Set `STORAGE_TYPE=s3` and add `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`, `AWS_REGION`. Uploads go to the bucket; `GET /api/assets/[assetId]` can serve via presigned URL (implementation may vary).

### Flow

1. On the [Generate](http://localhost:3000/generate) page, expand **Optional: Upload assets**.
2. Add logo, product photos, reference video, reference images, and/or brand colors (hex).
3. Click **Generate video**. If any files are selected, the app first uploads them via `POST /api/assets/upload`, then calls `POST /api/generate` with `{ input, assetIds?, brandColors? }`.
4. Job data includes `assetIds` and `brandColors`. The worker runs **asset analysis** when present (see below), then the full pipeline. Analysis output is passed to the visual layer for future use; rendering does not yet use assets.

### Asset analysis

When a job has `assetIds` or `brandColors`, the orchestrator runs **asset analysis** before the visual stage. This enriches uploads with metadata for later use in rendering (no image sourcing or rendering changes in this step).

- **Logo:** OpenRouter vision → dominant colors (2–3 hex), aspect ratio, has transparency, suggested placement (`outro` \| `watermark` \| `hero`).
- **Product photos:** Vision → dominant colors, aspect ratio, subject description, suggested shot types (`establish` \| `detail` \| `hero` \| `transition`).
- **Brand colors:** Pass-through (hex validated); no file analysis.
- **Reference video:** ffmpeg extracts 3–5 keyframes; vision analyzes frames for color palette; optional cuts-per-minute via scene detection.
- **Reference images:** Vision → color palette (3–5 hex), mood/style description.

Analysis uses the same OpenRouter API key; set `OPENROUTER_VISION_MODEL` in `.env.local` if you want a different model for vision (defaults to `OPENROUTER_MODEL` or `google/gemini-2.0-flash-lite-001`). Reference video keyframe extraction requires **ffmpeg** on the path. Keyframes are written to `uploads/_keyframes/[assetId]/`.

**Test analysis only:** `POST /api/assets/analyze` with body `{ assetIds: string[], brandColors?: { primary, secondary? } }` returns `AnalyzedAssets` (no pipeline run).

---

## File storage and cleanup

Cleanup keeps temp storage and uploads from growing indefinitely. It runs **automatically** via a BullMQ repeatable job when the worker is running.

### What gets cleaned

| Target | Location | Retention (configurable) |
|--------|----------|---------------------------|
| Rendered videos | `public/temp/*.mp4`, `public/output/*.mp4` | 24 hours |
| Uploaded assets | `uploads/` (files and subdirs like `_keyframes/`) | 24 hours |
| Temp images | `public/temp/[jobId]/` (per-job image dirs) | 1 hour |

`uploads/_registry.json` is never deleted. Only files/dirs older than the retention window are removed.

### How it runs

- **Scheduler:** BullMQ repeatable job. When you start the worker (`npm run worker`), it registers a cleanup job that runs every hour (or `CLEANUP_INTERVAL_HOURS`). No separate cron or process.
- **Manual trigger:** `POST /api/cleanup` runs cleanup once and returns `{ videosDeleted, uploadsDeleted, tempImagesDeleted, errors }`. Useful for testing. If `CLEANUP_SECRET` is set, send `X-Cleanup-Secret: <value>` to authorize.

### Env and behavior

- `CLEANUP_ENABLED` — `true` (default) or `false`. Set to `false` to disable cleanup (e.g. dev/debug).
- `VIDEO_RETENTION_HOURS` — default `24`. Delete rendered MP4s older than this.
- `UPLOAD_RETENTION_HOURS` — default `24`. Delete uploads older than this.
- `CLEANUP_INTERVAL_HOURS` — default `1`. How often the repeatable cleanup job runs (when worker is up).
- `CLEANUP_SECRET` — optional. When set, `POST /api/cleanup` requires header `X-Cleanup-Secret` to match (use in prod to avoid public trigger).

Cleanup only deletes inside the designated dirs; paths are validated so source code and other paths are never touched. Failed deletes are logged and collected in `errors`; the process does not crash.

---

## Image sourcing (mandatory)

**Images are mandatory.** Every shot gets an image (URL or path). The pipeline does not render with abstract-only visuals; if image sourcing fails for any shot, the job fails with a clear message: "Could not obtain images for video."

### Behavior

- **User uploaded product photos:** Product photos are assigned to shots by matching shot purpose (establish, detail, hero, transition) to analyzed suggested shot types. Remaining shots get images from stock or AI-generated.
- **No uploads:** Per shot, the system derives a search query and image prompt from shot purpose, script text, and intent (via OpenRouter LLM). It then tries: **Unsplash** (primary stock) → **DALL·E 3** (AI fallback) → **Pexels** (alternate stock) → simplified query retry. **If all fail**, we use a **placeholder** so the video still generates (no hard failure).

### Retry order

1. Stock API (Unsplash primary, Pexels fallback)
2. AI-generated (OpenAI DALL·E 3)
3. Alternate stock (if Unsplash first, try Pexels, or vice versa)
4. Simplified query retry
5. **If all fail → use placeholder** (`/fallback.png`); video still generates.

### Env and APIs

- **Unsplash (primary):** [Register app](https://unsplash.com/oauth/applications), add `UNSPLASH_ACCESS_KEY` to `.env.local`.
- **Pexels (fallback):** [Get API key](https://www.pexels.com/api/), add `PEXELS_API_KEY`.
- **OpenAI DALL·E 3 (fallback):** [API keys](https://platform.openai.com/api-keys), add `OPENAI_API_KEY`.

Set at least one image source (Unsplash or Pexels) for real images; if none are set or all APIs fail, a placeholder is used so the job still completes. Query/prompt derivation uses `OPENROUTER_API_KEY` (same as pipeline).

### “Could not obtain image” / fixing failures

If you see *“Could not obtain image for shot shot-X (query: …). Tried Unsplash, DALL·E, Pexels”*, the pipeline now **uses a placeholder** and the video still generates. To get real images instead:

- Add **UNSPLASH_ACCESS_KEY** and/or **PEXELS_API_KEY** (and optionally **OPENAI_API_KEY** for DALL·E) to `.env.local`.
- Restart the worker after changing env. Check logs for `[images] No image for shot … Using placeholder` if APIs are missing or failing.

### Future: Google Veo 3 (video-from-text)

[Google Veo 3](https://ai.google.dev/gemini-api/docs/video) (and Veo 3.1 on [Vertex AI](https://cloud.google.com/vertex-ai/generative-ai/docs/video/generate-videos-from-text)) is a **video** generation API (text-to-video, image-to-video), not still images. CUTLINE today composes **still images** + TTS + motion in Remotion. To use Veo 3 you’d either: (1) generate **video clips per shot** with Veo and stitch them (replacing or supplementing stock/DALL·E images), or (2) generate one full video from a prompt and optionally overlay TTS/subtitles. Integration would require a new provider (Gemini/Vertex API keys), clip download and caching, and composition changes; it’s a natural future extension for full AI video.

### Test in isolation

`POST /api/images/source` with body `{ intent, shotList, script, analyzedAssets?, assetPaths? }` returns `ImageSpec` (per-shot `shotId`, `imageUrl`, `source`, `fallbackUsed`). Use this to test sourcing without running the full pipeline.

---

## Remotion & video render (image-aware)

The video is built with [Remotion](https://www.remotion.dev/). The composition is **image-aware**: each shot displays the image from **ImageSpec** as the primary visual (no abstract-only fallback). Pipeline outputs (script, shot list, subtitle track, motion spec, **image spec**) plus TTS audio are passed into the composition.

- **Every shot has an image** from ImageSpec (or a placeholder if sourcing failed). The composition uses `ImageBackground` per shot: image as full-frame background with **motion** (scale, pan, zoom) applied from MotionSpec. If an image fails to load at render time, the composition throws—no fallback to gradient/shapes.
- **Image sizing:** Images use `object-fit: cover` (scale to fill, crop overflow) for a consistent frame. Motion (zoom, pan) helps hide awkward crops.
- **Logo overlay:** When the user uploaded a logo and **AnalyzedAssets.logo** exists, the orchestrator passes **logoUrl** and **logoPlacement** (`outro` \| `watermark` \| `hero`) to the composition. `LogoOverlay` shows the logo in the appropriate shot(s): watermark = lower right small; outro = last shot, centered; hero = first shot, top center.

### Remotion preview

To preview the composition in the Remotion studio (with sample or custom props):

```bash
npx remotion studio src/remotion/index.tsx
```

Open the composition `CUTLINEComposition` and provide props (or use default sample data) to scrub the timeline and debug.

### Render video

**Via API (recommended for full pipeline):**  
For **async** generation (recommended), use the [Generate](http://localhost:3000/generate) page and the worker (`npm run worker`). The pipeline runs image sourcing after visuals; every shot gets an image (from APIs or placeholder).  
On the [test page](http://localhost:3000/test), run all stages (Intent → Narrative → Shots → Script → Subtitles → TTS), then call `POST /api/images/source` with intent, shotList, script to get `imageSpec`, then call `POST /api/render` with the pipeline payload plus **imageSpec** and optional `audioBase64`. The response includes `videoUrl` (e.g. `/output/video-xyz.mp4`). The file is written to `public/output/`. Render requires **imageSpec**; missing shots use a placeholder.

**Via CLI:**  
To render from the command line with a props file:

```bash
npx remotion render src/remotion/index.tsx CUTLINEComposition public/output/video.mp4 --props=path/to/props.json
```

`props.json` must include `script`, `shotList`, `subtitleTrack`, `motionSpec`, `visualSpec`, **imageSpec** (required), and optionally `logoUrl`, `logoPlacement`, `audioBase64`. You can copy the payload shape from the test UI or from a successful `/api/render` request.

---

## Stage 1: Intent interpretation

The only implemented pipeline stage so far is **Intent Interpretation**. It turns one sentence into a structured intent (audience, goal, tone, complexity, duration).

### Test via UI

1. Start the dev server and open [http://localhost:3000/test](http://localhost:3000/test).
2. Enter a sentence (e.g. “Explain why coffee makes you feel awake in 30 seconds”).
3. Click **Analyze**. The interpreted intent is shown below (audience, goal, tone, complexity, duration).

If the API fails, you’ll see an error (e.g. “Check your API key and try again.”).

### Test via curl

```bash
curl -X POST http://localhost:3000/api/intent \
  -H "Content-Type: application/json" \
  -d '{"input": "Explain why coffee makes you feel awake in 30 seconds"}'
```

Response is JSON: `{ "audience", "goal", "tone", "complexity", "durationSeconds", "rawInput" }`.

---

## Limitations

- **Rate limits:** API and provider rate limits apply (OpenRouter, TTS, Unsplash/Pexels). Default app limits: 5 generate/hour, 20 upload/hour per IP.
- **Retention:** Rendered videos and uploads are cleaned automatically (default 24h). Configure `VIDEO_RETENTION_HOURS`, `UPLOAD_RETENTION_HOURS`.
- **Render time:** Full pipeline (Intent → Render) typically 1–3 minutes depending on length and image sourcing.
- **Worker required:** Async video generation needs the worker process and Redis; Vercel alone cannot run the pipeline.
- **Storage:** Local disk on worker for temp/output; use S3 for uploads in production if needed.

---

## Production checklist

Before deploying, see **[docs/PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md)** for a verification list (env vars, Redis, worker, API keys, rate limiting, cleanup, storage, Remotion test).

---

This repo contains the CUTLINE MVP—production-ready for portfolio and demos.
