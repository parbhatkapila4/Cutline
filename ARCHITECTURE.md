# CUTLINE - Architecture

A 5‑minute overview for engineers. One sentence in → video out.

---

## Pipeline flow

The video pipeline runs in order. Each stage consumes the previous output; any failure throws and the job is marked failed (with retries for transient failures).

```
Input (one sentence)
    ↓
1. Intent        - LLM: audience, goal, tone, complexity, duration
    ↓
2. Narrative     - LLM: arc, 3-5 beats, pacing
    ↓
3. Shots         - LLM: 8-12 shots, purpose, motion, text density
    ↓
4. Script        - LLM: spoken text (or silence) per shot
    ↓
5. Subtitles     - In-process: chunk script, estimate timing
    ↓
6. TTS           - ElevenLabs/PlayHT: audio per segment, silence where text is null
    ↓
7. Subtitle refine - Word timings from TTS → align subtitle chunks
    ↓
8. Motion        - In-process: motion spec per shot (from shot list)
    ↓
9. Asset analysis - If uploads: LLM vision on logo, product photos, ref video/images
    ↓
10. Visuals      - In-process: visual spec (colors, layout) from intent + assets
    ↓
11. Image sourcing - Per shot: LLM query → Unsplash → DALL·E → Pexels → simplified query
    ↓
12. Remotion render - Compose script, shots, subtitles, motion, images, audio → MP4
    ↓
Output: public/temp/[jobId].mp4
```

**Key:** LLM = OpenRouter. Images are mandatory; no abstract-only render.

---

## Job queue

- **Queue:** BullMQ (Redis). Queue name: `video-generation`.
- **Create job:** `POST /api/generate` → validates input → `queue.add("video", { input, assetIds?, brandColors? })` → returns `jobId`.
- **Worker:** Separate Node process (`npm run worker`). Runs `runPipeline(job.data)` for each job. On success: job completed, `returnvalue = { videoPath }`. On failure: job failed, `failedReason` = error message.
- **Poll:** `GET /api/generate/[jobId]` → returns `{ status, videoUrl?, error? }`. Status: `pending` | `processing` | `completed` | `failed`.
- **Cleanup:** BullMQ repeatable job (when worker is up) deletes old temp videos, uploads, per-job images. Config: `CLEANUP_ENABLED`, `VIDEO_RETENTION_HOURS`, etc.

---

## Key modules

| Area | Location | Role |
|------|----------|------|
| Pipeline orchestration | `src/lib/pipeline/orchestrator.ts` | Runs all stages in order; wraps LLM/TTS/image/render with retry |
| Intent | `src/lib/pipeline/intent.ts` | OpenRouter → structured intent |
| Narrative | `src/lib/pipeline/narrative.ts` | OpenRouter → beats, arc |
| Shots | `src/lib/pipeline/shots.ts` | OpenRouter → shot list |
| Script | `src/lib/pipeline/script.ts` | OpenRouter → script entries |
| Subtitles | `src/lib/pipeline/subtitles.ts` | Chunk script, estimate timing |
| TTS | `src/lib/pipeline/tts.ts` | ElevenLabs/PlayHT → audio |
| Motion / Visuals | `src/lib/pipeline/motion.ts`, `visuals.ts` | In-process specs |
| Image sourcing | `src/lib/images/source.ts` | Per-shot: derive query → Unsplash/DALL·E/Pexels |
| Render | `src/lib/pipeline/renderVideo.ts` | Remotion CLI → MP4 |
| Queue | `src/lib/queue/videoQueue.ts` | BullMQ queue + worker definition |
| Validation | `src/lib/validation/input.ts`, `src/lib/assets/validation.ts` | Input and asset validation |
| Retry | `src/lib/utils/retry.ts` | Retry with backoff for LLM, TTS, image, render |

---

## Storage and cleanup

- **Rendered videos:** `public/temp/[jobId].mp4` (and optionally `public/output/`). Served at `/temp/[jobId].mp4`.
- **Uploads:** `uploads/` (or S3 if `STORAGE_TYPE=s3`). Registry: `uploads/_registry.json`.
- **Per-job images:** `public/temp/[jobId]/images/` (downloaded/generated during image sourcing).
- **Cleanup:** Repeatable job (worker) deletes files older than retention. Paths validated; no deletion outside designated dirs.

---

## Data flow (async generate)

1. User submits sentence (and optional assets) on `/generate`.
2. If assets: `POST /api/assets/upload` → store files → `assetIds`.
3. `POST /api/generate` → body `{ input, assetIds?, brandColors? }` → rate limit → validate → `queue.add(...)` → `{ jobId }`.
4. Worker: `runPipeline({ input, jobId, assetIds?, brandColors? })` → stages 1-12 → write MP4.
5. UI polls `GET /api/generate/[jobId]` until `status === "completed"` or `"failed"` → show video or error.

---

## Deployment note

- **Next.js** (API + UI) can run on Vercel. API routes only enqueue jobs and poll; they do not run the pipeline.
- **Worker + Redis** must run elsewhere (Railway, Render, Fly.io, etc.). Same env vars; worker runs `npm run worker` and connects to the same Redis as the app.
