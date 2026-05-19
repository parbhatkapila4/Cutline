# CUTLINE: Claude Code Context

> One sentence → One finished MP4. This file is the complete mental model for the codebase. Read it before touching anything.

---

## What This Project Does

CUTLINE takes a single sentence of intent and returns a rendered 30-60 second MP4 video: no templates, no user config, no storyboards. An AI director layer handles everything: audience inference, narrative arc, shot planning, scriptwriting, TTS audio, subtitle timing, image sourcing, and Remotion composition.

**The user types one sentence. They get a video.**

---

## Architecture in One Picture

```
Browser (Next.js UI)
    │
    ▼
POST /api/generate  ──→  BullMQ job created  ──→  Redis queue
                                                        │
                                               npm run worker
                                                        │
                                    ┌───────────────────▼──────────────────┐
                                    │           12-STAGE PIPELINE           │
                                    │                                       │
                                    │  1. Intent        (LLM)               │
                                    │  2. Narrative     (LLM)               │
                                    │  3. Shots         (LLM)               │
                                    │  4. Script        (LLM)               │
                                    │  5. Subtitles     (in-process)        │
                                    │  6. TTS           (ElevenLabs/PlayHT) │
                                    │  7. Subtitle refine (word timings)    │
                                    │  8. Motion        (in-process)        │
                                    │  9. Asset analysis (LLM vision)       │
                                    │  10. Visuals      (in-process)        │
                                    │  11. Image sourcing (Unsplash→DALL·E→Pexels→placeholder) │
                                    │  12. Remotion render → MP4            │
                                    └───────────────────────────────────────┘
                                                        │
                                    public/temp/[jobId].mp4
                                                        │
Browser polls GET /api/generate/[jobId]  ◀──────────────┘
until status = "completed" | "failed"
```

**Critical architectural fact:** The Next.js app and the worker are separate processes. The app enqueues, the worker executes. You cannot do video generation without the worker running.

---

## Repo Structure

```
src/
├── app/
│   ├── api/
│   │   ├── generate/          # POST create job, GET status, cancel, download
│   │   ├── v1/generate/       # Versioned aliases (same handlers)
│   │   ├── intent/            # Test intent stage in isolation
│   │   ├── narrative/         # Test narrative stage in isolation
│   │   ├── shots/             # Test shots stage in isolation
│   │   ├── script/            # Test script stage in isolation
│   │   ├── subtitles/         # POST subtitles + POST subtitles/refine
│   │   ├── tts/               # Test TTS in isolation
│   │   ├── motion/            # Test motion spec
│   │   ├── visuals/           # Test visual spec
│   │   ├── images/source/     # Test image sourcing
│   │   ├── render/            # Test Remotion render directly
│   │   ├── assets/            # upload, analyze, [assetId]
│   │   ├── auth/[...all]/     # Better Auth catch-all
│   │   ├── telemetry/         # Job timing, admin stats
│   │   ├── health/            # /live, /ready, combined
│   │   ├── cleanup/           # Manual temp cleanup
│   │   └── admin/             # Admin auth (cookie session)
│   ├── generate/              # Main UI: the generate page
│   ├── test/                  # Pipeline stage test page
│   ├── admin/                 # Admin dashboard (job table)
│   ├── auth/[...path]/        # Sign-in, sign-up, forgot-password pages
│   └── layout.tsx / page.tsx
│
├── components/
│   ├── GenerateFlow.tsx        # Main UI component (job creation → polling → video)
│   ├── Hero.tsx
│   ├── HowItWorks.tsx
│   └── ui/sign-in.tsx          # Custom Better Auth sign-in form
│
├── lib/
│   ├── pipeline/              # ★ Core: orchestrator + all 12 stage modules
│   │   ├── orchestrator.ts    # Runs stages in sequence, checks cancellation between stages
│   │   ├── intent.ts
│   │   ├── narrative.ts
│   │   ├── shots.ts
│   │   ├── script.ts
│   │   ├── subtitles.ts
│   │   ├── tts.ts
│   │   ├── motion.ts
│   │   ├── visuals.ts
│   │   └── renderVideo.ts     # Calls Remotion
│   ├── queue/                 # BullMQ videoQueue setup
│   ├── rate-limit.ts          # Redis-backed per-IP rate limiting
│   ├── anon/                  # Anonymous funnel (cookie, session, migrate-on-auth)
│   ├── db/                    # Neon Postgres client + schema.sql
│   ├── jobs/                  # Video job ownership service
│   ├── assets/                # Upload storage, analysis, validation, types
│   ├── images/                # Unsplash, Pexels, DALL·E sourcing + source.ts orchestrator
│   ├── tts/                   # WAV utilities, silence stitching
│   ├── storage/               # Cleanup (temp videos, uploads, per-job images)
│   ├── validation/input.ts    # All generate request validation (Zod)
│   ├── platform/              # Platform strategy (linkedin/twitter/youtube_shorts/general)
│   ├── utils/                 # retry.ts, error.ts
│   └── types/                 # Shared types: Intent, Narrative, Shots, Script, Subtitles, etc.
│
├── remotion/
│   ├── Root.tsx               # Remotion root (registers CUTLINEComposition)
│   ├── CUTLINEComposition.tsx # Main composition: assembles all layers
│   └── components/
│       ├── ImageBackground.tsx
│       ├── SubtitleOverlay.tsx
│       ├── MotionLayer.tsx
│       └── LogoOverlay.tsx
│
└── worker.ts                  # BullMQ worker entry: runs pipeline, cleanup, retention
```

---

## The 12-Stage Pipeline (Deep Dive)

Each stage is a pure function: takes previous outputs, returns its output. All stages live in `src/lib/pipeline/`. The orchestrator in `orchestrator.ts` runs them in sequence and checks a Redis cancellation flag between every stage.

| # | Stage | Input | Output | Notes |
|---|-------|-------|--------|-------|
| 1 | **Intent** | raw string | `{ audience, goal, tone, complexity, durationSeconds }` | LLM call via OpenRouter |
| 2 | **Narrative** | Intent | `{ arc, beats[], pacing }` | LLM; 3-5 beats |
| 3 | **Shots** | Narrative + Intent | `ShotList[]` (8-12 shots) | Each shot has purpose, duration, text density, motion hint |
| 4 | **Script** | Shots + Narrative | spoken text per shot (null = silence) | LLM |
| 5 | **Subtitles** | Script + ShotList | `SubtitleTrack` with estimated timing | In-process, no LLM |
| 6 | **TTS** | Script + ShotList | audio per segment (WAV/MP3) + word timings | ElevenLabs (default) or PlayHT |
| 7 | **Subtitle refine** | SubtitleTrack + word timings | refined track aligned to actual spoken words | In-process |
| 8 | **Motion** | ShotList | `MotionSpec[]` (scale, pan, zoom per shot) | In-process |
| 9 | **Asset analysis** | assetIds (optional) | `AnalyzedAssets` (logo colors, product photos, reference style) | LLM vision, only if assets uploaded |
| 10 | **Visuals** | Intent + AnalyzedAssets | `VisualSpec` (colors, layout) | In-process |
| 11 | **Image sourcing** | Intent + ShotList + Script | `ImageSpec[]` (per-shot imageUrl + source) | Unsplash → DALL·E 3 → Pexels → placeholder |
| 12 | **Remotion render** | Everything above | `public/temp/[jobId].mp4` | Headless Remotion CLI |

### Cancellation
Between every stage, the orchestrator calls `checkCancelled(jobId)` which reads a Redis key `cutline:job:cancelled`. If set, the pipeline throws and cleanup runs. This means cancellation is eventual (waits for current stage to finish).

### Retries
Transient failures (429, 5xx, network errors) are retried up to 3x with exponential backoff. Configured via env: `RETRY_LLM_MAX`, `RETRY_TTS_MAX`, `RETRY_IMAGE_MAX`, `RETRY_RENDER_MAX`. Non-retryable: 4xx (except 429), validation errors.

---

## Data Flow Through Remotion

The final render passes everything into Remotion as props:

```typescript
// Simplified shape of what goes into CUTLINEComposition
{
  shotList: ShotList[],         // 8-12 shots with durations
  script: ScriptSegment[],      // spoken text per shot
  subtitleTrack: Subtitle[],    // chunks with start/end ms (global timeline)
  motionSpec: MotionSpec[],     // animation per shot
  visualSpec: VisualSpec,       // colors, layout
  imageSpec: ImageSpec[],       // per-shot imageUrl
  audioBase64?: string,         // stitched TTS audio (WAV)
  logoAsset?: { url, placement } // optional brand logo
}
```

Inside `CUTLINEComposition.tsx`, `useCurrentFrame()` drives everything. Subtitles use global timeline ms (Remotion frame * 1000 / fps). The `SubtitleOverlay` component handles show/hide timing.

---

## Key Flows

### Creating a Video (Happy Path)

1. `POST /api/generate` with `{ input, durationSeconds }`
2. Validation runs (`src/lib/validation/input.ts`): returns 400 with field errors on failure
3. BullMQ job created → `{ jobId }` returned immediately
4. Worker picks up the job → runs 12-stage pipeline
5. Browser polls `GET /api/generate/[jobId]` with exponential backoff (2s → 4s → 8s → 15s cap)
6. When `status: "completed"`, `videoUrl: "/temp/[jobId].mp4"` is returned
7. Download: `GET /api/generate/[jobId]/download` streams with `Content-Disposition: attachment`

### Job Cancellation

1. `POST /api/generate/[jobId]/cancel`
2. Sets Redis key `cutline:job:cancelled`
3. Worker checks this flag between stages
4. Pipeline exits at next checkpoint, cleanup runs

### Anonymous Funnel (when DATABASE_URL is set)

1. First visit → anonymous session created (Neon DB `anon_sessions`), cookie set
2. First video → free, session `generation_count` incremented
3. Second video or download → 403 `ANON_LIMIT_REACHED`
4. User signs in (Better Auth) → `migrateAnonToUserOnAuth()` reassigns all anon jobs to user
5. Without `DATABASE_URL`: no limits, no auth, all generations allowed

---

## Environment Variables

### Required (app won't start without these)

```bash
REDIS_URL=redis://localhost:6379
OPENROUTER_API_KEY=sk-or-...
ELEVENLABS_API_KEY=...
```

### Strongly Recommended

```bash
UNSPLASH_ACCESS_KEY=...   # primary image source
PEXELS_API_KEY=...        # fallback stock images
OPENAI_API_KEY=...        # DALL·E 3 fallback (also needs this for image gen)
```

### Optional Features

```bash
# Auth + anon funnel (needs Neon Postgres)
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=...           # min 32 chars
NEXT_PUBLIC_APP_URL=http://localhost:3001
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Video limits
MAX_VIDEO_DURATION_SECONDS=300   # global cap (default 300)
MAX_VIDEO_OUTPUT_MB=             # fail job if output exceeds N MB

# TTS alternative
TTS_PROVIDER=playht
PLAYHT_API_KEY=...
PLAYHT_USER_ID=...

# Admin panel
ADMIN_SECRET=...

# CORS (generate API only)
CORS_ORIGIN=https://your-frontend.com
# or multi: CORS_ORIGINS=https://a.com,https://b.com

# Cleanup
VIDEO_RETENTION_HOURS=24
UPLOAD_RETENTION_HOURS=24
CLEANUP_SECRET=...

# Retry tuning
RETRY_LLM_MAX=3
RETRY_TTS_MAX=3
RETRY_IMAGE_MAX=2
RETRY_RENDER_MAX=2

# Rate limiting
RATE_LIMIT_GENERATE=5          # per hour per IP
RATE_LIMIT_UPLOAD=20
RATE_LIMIT_STATUS=60
```

---

## Running Locally

```bash
# 1. Clone and install
git clone <repo>
cd cutline
npm install
cp .env.example .env.local
# Fill in REDIS_URL, OPENROUTER_API_KEY, ELEVENLABS_API_KEY

# 2. Start Redis (if not running)
docker run -d -p 6379:6379 redis

# 3. Terminal 1: Next.js app
npx next dev

# 4. Terminal 2: Worker (required for video generation)
npm run worker

# 5. (Optional) If using auth + anon funnel
npm run auth:migrate  # creates Better Auth tables in Neon
```

App: `http://localhost:3000`
Generate page: `http://localhost:3000/generate`
Test page (stage isolation): `http://localhost:3000/test`
Admin: `http://localhost:3000/admin`

---

## API Reference (Quick)

### Versioning
- **Canonical:** `/api/v1/...`
- **Backward-compatible:** `/api/...` (same handlers, kept for compatibility)
- All v1 responses include `X-API-Version: 1`

### Core Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/v1/generate` | Create job. Returns `{ jobId }` |
| `GET` | `/api/v1/generate/:jobId` | Poll status. Returns `{ status, videoUrl?, error? }` |
| `POST` | `/api/v1/generate/:jobId/cancel` | Cancel job |
| `GET` | `/api/v1/generate/:jobId/download` | Stream MP4 (attachment) |
| `GET` | `/api/v1/generate/jobs` | List recent jobs (max 50) |
| `POST` | `/api/suggest-prompt` | Expand/refine a prompt |
| `GET` | `/api/health` | Combined health (env + Redis) |
| `GET` | `/api/health/live` | Liveness (process up?) |
| `GET` | `/api/health/ready` | Readiness (can serve traffic?) |
| `POST` | `/api/cleanup` | Manual cleanup trigger |

### Generate Request Body

```typescript
{
  input: string,              // 5-2000 chars, required
  durationSeconds: number,    // 10-60, required
  assetIds?: string[],        // from /api/assets/upload
  brandColors?: {
    primary?: string,         // hex
    secondary?: string
  },
  mode?: "slideshow" | "talking_object",
  platform?: "general" | "linkedin" | "twitter" | "youtube_shorts",
  variationCount?: number,    // 1-5
  captions?: "on" | "off",
  renderMode?: "preview" | "final",
  previewJobId?: string       // required when renderMode = "final"
}
```

### Error Shape (all errors)

```typescript
{
  error: string,              // human-readable, don't branch on this
  code: string,               // stable UPPER_SNAKE_CASE: branch on this
  details?: unknown
}
```

### Error Codes

| Code | HTTP | When |
|------|------|------|
| `VALIDATION_FAILED` | 400 | Input validation failed; `details.errors` has field-level issues |
| `INVALID_JSON` | 400 | Body isn't valid JSON |
| `BAD_REQUEST` | 400 | Generic bad request |
| `RATE_LIMITED` | 429 | Too many requests; check `Retry-After` header |
| `JOB_NOT_FOUND` | 404 | No job with that ID |
| `JOB_NOT_READY` | 404 | Download attempted before job completes |
| `VIDEO_NOT_FOUND` | 404 | File cleaned up or missing |
| `JOB_CANNOT_CANCEL` | 409 | Job already finished |
| `ANON_LIMIT_REACHED` | 403 | Anonymous user hit free limit |
| `AUTH_REQUIRED` | 403 | Action needs sign-in |
| `INTERNAL_ERROR` | 500 | Unhandled error |

---

## Pipeline Stage Test Endpoints

Each stage can be tested in isolation via `POST`, useful for debugging or dev:

```bash
# Test intent parsing
curl -X POST localhost:3000/api/intent \
  -H "Content-Type: application/json" \
  -d '{"input": "Explain how Redis works in 30 seconds"}'

# Test image sourcing
curl -X POST localhost:3000/api/images/source \
  -H "Content-Type: application/json" \
  -d '{"intent": {...}, "shotList": [...], "script": [...]}'
```

All stage endpoints are documented in the main README. Use `localhost:3000/test` for a UI-based stage tester.

---

## Asset Upload Flow

```
POST /api/assets/upload  (multipart/form-data)
  → Returns { assetIds: string[] }

POST /api/assets/analyze
  Body: { assetIds, brandColors? }
  → Returns AnalyzedAssets (logo colors, product photo descriptions, etc.)

// Pass assetIds into POST /api/generate
// Pipeline runs asset analysis at stage 9 automatically
```

Supported: logo (PNG/SVG), product photos (JPEG/PNG), reference video, reference images, brand colors (hex).

---

## Idempotency

`POST /api/generate` supports `X-Idempotency-Key` header (max 128 chars). Same key within 24h returns the same `jobId`. Storage is **in-memory only**; lost on server restart.

---

## Webhooks

Pass `callbackUrl` in generate body. When job reaches terminal state, a `POST` fires:

```json
{
  "jobId": "...",
  "status": "completed" | "failed" | "cancelled",
  "videoUrl": "/temp/[jobId].mp4",
  "completedAt": "ISO timestamp",
  "error": "if failed"
}
```

Fire-and-forget. No retries. 5s timeout. Localhost rejected in production (set `ALLOW_LOCALHOST_WEBHOOK=true` for dev).

---

## Authentication (Better Auth)

Only active when `DATABASE_URL` is set.

- **Email/password** and **Google OAuth**
- Sign-in page: `/auth/sign-in`
- API catch-all: `/api/auth/[...all]`
- After sign-in, `migrateAnonToUserOnAuth(request, userId)` runs to merge anonymous jobs into user
- Config: `src/lib/auth.ts` (server), `src/lib/auth-client.ts` (client)

Google OAuth setup:
1. Google Cloud Console → OAuth client
2. Redirect URI: `{NEXT_PUBLIC_APP_URL}/api/auth/callback/google`

---

## Database Schema (Neon Postgres)

Only used when `DATABASE_URL` is set. Apply `src/lib/db/schema.sql` once via Neon Dashboard SQL Editor. Then run `npm run auth:migrate` for Better Auth tables.

```sql
-- anon_sessions
id UUID PRIMARY KEY
created_at TIMESTAMPTZ
generation_count INT DEFAULT 0

-- video_jobs
id TEXT PRIMARY KEY
owner_type TEXT  -- 'anon' | 'user'
owner_id TEXT    -- anon_session_id or user_id
prompt TEXT
status TEXT
preview_url TEXT
final_url TEXT
created_at TIMESTAMPTZ
queue_job_id TEXT  -- BullMQ job ID
```

---

## Telemetry + Admin

- `GET /api/telemetry`: recent jobs list (up to 500, query `?limit=50`)
- `GET /api/telemetry/:jobId`: single job with per-stage timings
- `GET /api/telemetry/stats`: aggregate (total, completed, failed, avgDurationMs)
- Admin UI: `/admin` (requires `ADMIN_SECRET` env, cookie auth via `POST /api/admin/auth`)
- Optional persistence: `TELEMETRY_FILE=.data/telemetry.json`

---

## Cleanup Strategy

Three layers of cleanup:

1. **Per-job temp dir** (`public/temp/{jobId}/`): deleted immediately when pipeline finishes (success or failure). Contains intermediates: images, veo chunks, preview artifacts.
2. **Final MP4s** (`public/temp/{jobId}.mp4`): retained for `VIDEO_RETENTION_HOURS` (default 24h), cleaned by repeating BullMQ job in worker.
3. **Orphan cleanup**: if `CLEANUP_EXPIRED_HOURS` set, worker runs `cleanupExpiredTempDirs` every 60 min to catch dirs from crashed jobs.

Manual trigger: `POST /api/cleanup` (optionally protected by `CLEANUP_SECRET` header).

---

## Platform Strategy

Set `platform` in generate body to tune output for a specific channel:

| Platform | Behavior |
|----------|----------|
| `general` | Default. No platform-specific adjustments |
| `linkedin` | Professional tone, thought-leadership framing |
| `twitter` | Hook-first, punchy, fast cuts |
| `youtube_shorts` | Vertical-optimized, retention hooks |

All logic in `src/lib/platform/platformStrategy.ts`. Each stage reads platform context and appends prompt snippets accordingly.

---

## Deployment

### Recommended: Vercel (app) + Railway/Render (worker + Redis)

```
Vercel:
  - Next.js app (API routes + UI)
  - Set all env vars in Vercel dashboard
  - No video rendering happens here

Railway/Render/Fly.io:
  - Redis instance
  - npm run worker (long-running process)
  - Same env vars as app
  - Needs persistent disk OR S3 (STORAGE_TYPE=s3) for uploads/temp
```

### All-in-one (Railway/Render)

```bash
npm run build && npm run start   # process 1
npm run worker                   # process 2 (same host)
```

---

## Common Issues & Debugging

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| Job stuck in `pending` | Worker not running | `npm run worker` in separate terminal |
| Job stuck in `processing` | LLM/TTS timeout | Check OpenRouter + ElevenLabs keys; check worker logs |
| `500` on generate | Missing required env vars | Check `REDIS_URL`, `OPENROUTER_API_KEY`, `ELEVENLABS_API_KEY` |
| Images all placeholders | No image API keys set | Set `UNSPLASH_ACCESS_KEY` or `PEXELS_API_KEY` |
| `403 ANON_LIMIT_REACHED` | DB enabled, anon limit hit | Sign in, or unset `DATABASE_URL` for dev |
| `409 JOB_CANNOT_CANCEL` | Job already finished | Expected; can't cancel completed jobs |
| TTS fails after 3 retries | Rate limit or wrong key | Check ElevenLabs quota; switch to `TTS_PROVIDER=playht` |
| Webhook not firing | Localhost URL in production | Set `ALLOW_LOCALHOST_WEBHOOK=true` for dev |
| Auth tables missing | Forgot to migrate | `npm run auth:migrate` |

---

## Testing

```bash
npm run test          # Vitest watch
npm run test:run      # CI single run
npm run test:coverage # Coverage report
npm run lint          # ESLint
```

Unit tests live next to source (`*.test.ts`).

Integration test (`src/app/api/generate/generate.integration.test.ts`): requires `REDIS_URL` set + both `npm run dev` and `npm run worker` running. Skipped otherwise.

---

## What NOT to Do

- **Don't run video rendering on Vercel**: serverless functions time out; rendering needs the worker
- **Don't skip the worker**: without `npm run worker`, all generate jobs sit in `pending` forever
- **Don't store secrets in code**: all API keys via env only; never logged or returned in responses
- **Don't add new pipeline stages without a cancellation check**: every new stage needs to call `checkCancelled()` at its start
- **Don't duplicate handler logic**: versioned (`/api/v1/`) and unversioned routes share the same handlers in `src/app/api/generate/handlers.ts`

---

## Key Design Decisions (the "why")

- **One sentence → one video**: Keeps the product's scope hard-bounded. No template picker, no knob tuning. If you're adding UI controls, reconsider.
- **Pipeline over monolith**: Each stage is independently testable via its own API endpoint. This is intentional; use `/test` page or curl during development.
- **Worker separate from app**: Rendering is CPU-heavy and long-running. Serverless won't work. The separation is load-bearing.
- **Images mandatory, never blocking**: Every shot must have an image. The 4-fallback chain (Unsplash → DALL·E → Pexels → placeholder) ensures a video always completes, even if image APIs fail.
- **Validation before pipeline**: All input validation runs before any pipeline stage starts. A bad request should never reach OpenRouter.
- **Error codes over messages**: Clients branch on `code` (stable), not `error` (human-readable, can change).