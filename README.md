# CUTLINE

AI-directed video editing. One sentence of intent → a 30–45 second edited video. The system decides narrative, shots, pacing, motion, subtitles, and voice. No templates, no user config, deterministic output.

---

## Run the project

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the landing page.

---

## Environment

1. Copy `.env.example` to `.env.local`.
2. Add your [OpenRouter](https://openrouter.ai) API key to `.env.local` as `OPENROUTER_API_KEY`.
3. Optionally set `OPENROUTER_MODEL` to choose the model (default: `anthropic/claude-3.5-sonnet`). You can switch to e.g. `openai/gpt-4o` without changing code.

Example `.env.local`:

```
REDIS_URL=redis://localhost:6379
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
```

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

Rendered videos are written to `public/temp/[jobId].mp4` and served at `/temp/[jobId].mp4`. Cleanup policy can be added later (e.g. delete files older than 24h).

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

Analysis uses the same OpenRouter API key; set `OPENROUTER_VISION_MODEL` in `.env.local` if you want a different model for vision (defaults to `OPENROUTER_MODEL` or `anthropic/claude-3-5-sonnet`). Reference video keyframe extraction requires **ffmpeg** on the path. Keyframes are written to `uploads/_keyframes/[assetId]/`.

**Test analysis only:** `POST /api/assets/analyze` with body `{ assetIds: string[], brandColors?: { primary, secondary? } }` returns `AnalyzedAssets` (no pipeline run).

### Cleanup

- **TODO:** Delete uploads older than 24 hours (cron or on next job). Not implemented in this scope—only documented.

---

## Image sourcing (mandatory)

**Images are mandatory.** Every shot gets an image (URL or path). The pipeline does not render with abstract-only visuals; if image sourcing fails for any shot, the job fails with a clear message: "Could not obtain images for video."

### Behavior

- **User uploaded product photos:** Product photos are assigned to shots by matching shot purpose (establish, detail, hero, transition) to analyzed suggested shot types. Remaining shots get images from stock or AI-generated.
- **No uploads:** Per shot, the system derives a search query and image prompt from shot purpose, script text, and intent (via OpenRouter LLM). It then tries: **Unsplash** (primary stock) → **DALL·E 3** (AI fallback) → **Pexels** (alternate stock) → simplified query retry. Failures are logged; the job only fails if all attempts fail for a shot.

### Retry order

1. Stock API (Unsplash primary, Pexels fallback)
2. AI-generated (OpenAI DALL·E 3)
3. Alternate stock (if Unsplash first, try Pexels, or vice versa)
4. Simplified query retry
5. If all fail → throw; job fails (no abstract-only render)

### Env and APIs

- **Unsplash (primary):** [Register app](https://unsplash.com/oauth/applications), add `UNSPLASH_ACCESS_KEY` to `.env.local`.
- **Pexels (fallback):** [Get API key](https://www.pexels.com/api/), add `PEXELS_API_KEY`.
- **OpenAI DALL·E 3 (fallback):** [API keys](https://platform.openai.com/api-keys), add `OPENAI_API_KEY`.

At least one image source is required (Unsplash or Pexels); DALL·E is used when stock fails. Query/prompt derivation uses `OPENROUTER_API_KEY` (same as pipeline).

### Test in isolation

`POST /api/images/source` with body `{ intent, shotList, script, analyzedAssets?, assetPaths? }` returns `ImageSpec` (per-shot `shotId`, `imageUrl`, `source`, `fallbackUsed`). Use this to test sourcing without running the full pipeline.

---

## Remotion & video render (image-aware)

The video is built with [Remotion](https://www.remotion.dev/). The composition is **image-aware**: each shot displays the image from **ImageSpec** as the primary visual (no abstract-only fallback). Pipeline outputs (script, shot list, subtitle track, motion spec, **image spec**) plus TTS audio are passed into the composition.

- **Images are mandatory.** Every shot has an image URL or path from ImageSpec. The composition uses `ImageBackground` per shot: image as full-frame background with **motion** (scale, pan, zoom) applied from MotionSpec. If an image fails to load at render time, the composition throws—no fallback to gradient/shapes.
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
For **async** generation (recommended), use the [Generate](http://localhost:3000/generate) page and the worker (`npm run worker`). The pipeline runs image sourcing after visuals; images are mandatory.  
On the [test page](http://localhost:3000/test), run all stages (Intent → Narrative → Shots → Script → Subtitles → TTS), then call `POST /api/images/source` with intent, shotList, script to get `imageSpec`, then call `POST /api/render` with the pipeline payload plus **imageSpec** and optional `audioBase64`. The response includes `videoUrl` (e.g. `/output/video-xyz.mp4`). The file is written to `public/output/`. Render requires **imageSpec**; images are mandatory.

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

This repo contains the early MVP and experiments for CUTLINE.
