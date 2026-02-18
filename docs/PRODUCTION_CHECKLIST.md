# CUTLINE - Production checklist

Use this list before going live. Tick each item when verified.

---

## Options verification summary (code + tests)

The following were verified in code and tests so you can rely on 1–2 manual runs instead of many:

- **Duration:** UI sends `durationSeconds` (10–60); API validates and puts it in job data; worker passes it to the pipeline; orchestrator overrides intent duration and uses it for script length (slideshow) and for talking_object effective duration and Veo chunking. Tests: API accepts 30/40/50 and includes in job data; API rejects &lt;10 and &gt;60.
- **Captions:** UI sends `captions: "on" | "off"`; API accepts and defaults to `"on"`; job data includes `captions`; pipeline uses `getCaptionsRenderOption(captions, subtitleTrackRefined)` so that `captions === "off"` yields `showCaptions: false` and empty `subtitleTrack`; Remotion receives that and does not render the subtitle layer. Tests: API job data includes captions on/off; orchestrator `getCaptionsRenderOption("off", …)` returns showCaptions false and empty track; `buildRemotionProps` with showCaptions false yields Remotion props with showCaptions false.
- **Mode:** API accepts `mode: "slideshow" | "talking_object"` and includes it in job data; worker passes it to pipeline; orchestrator branches on mode (slideshow vs talking_object). Test: API includes mode in job data for both values.
- **textModel / assetIds / brandColors:** Read from request, validated, stored in job data, passed to pipeline and used (script model override, asset analysis, product photos, brand colors). Test: API includes textModel and assetIds in job data when provided.

No fixes were required for wiring; tests were added to lock behavior.

---

## Environment

- [ ] **All env vars set** in production (Vercel / worker host). Copy from `.env.example`; no placeholder values left.
- [ ] **REDIS_URL** correct and reachable from both Next.js and worker (e.g. Upstash ioredis URL).
- [ ] **OPENROUTER_API_KEY** set and valid (LLM for Intent, Narrative, Shots, Script, image query, asset analysis).
- [ ] **TTS:** Either `ELEVENLABS_API_KEY` (and `TTS_PROVIDER=elevenlabs`) or `PLAYHT_API_KEY` + `PLAYHT_USER_ID` (and `TTS_PROVIDER=playht`) set and valid.
- [ ] **Image sourcing:** At least one of `UNSPLASH_ACCESS_KEY` or `PEXELS_API_KEY` set and valid. `OPENAI_API_KEY` recommended for DALL·E fallback.
- [ ] **Storage:** If `STORAGE_TYPE=s3`, all `AWS_*` vars set and bucket writable. If local, worker host disk writable for `UPLOAD_DIR` and `public/temp`.

---

## Worker and Redis

- [ ] **Redis** running and reachable (same instance used by app and worker).
- [ ] **Worker process** running (e.g. Railway/Render background worker, or second process on same host). Command: `npm run worker`.
- [ ] Worker has the **same env vars** as the app (OpenRouter, TTS, image keys, `REDIS_URL`, etc.).
- [ ] Worker **logs** visible (e.g. “Job completed”, “Job failed”) for debugging.

---

## API keys and quotas

- [ ] **OpenRouter** key has quota and correct model (e.g. `OPENROUTER_MODEL=anthropic/claude-3.5-sonnet`).
- [ ] **TTS** key valid and voice ID correct; check provider rate limits.
- [ ] **Unsplash / Pexels** keys valid; check rate limits.
- [ ] **OpenAI** key valid if using DALL·E fallback.

---

## Safety and operations

- [ ] **Rate limiting** enabled (`RATE_LIMIT_ENABLED=true`). Tune `RATE_LIMIT_GENERATE`, `RATE_LIMIT_UPLOAD`, `RATE_LIMIT_STATUS` as needed.
- [ ] **Cleanup** enabled (`CLEANUP_ENABLED=true`) so temp videos and uploads are deleted after retention. Or external cron calling `POST /api/cleanup` with `X-Cleanup-Secret` if using `CLEANUP_SECRET`.
- [ ] **CLEANUP_SECRET** set in production if you want to restrict manual cleanup to authorized callers.
- [ ] **Retry** config acceptable (`RETRY_ENABLED=true`, max retries for LLM/TTS/image/render as in `.env.example`).

---

## Storage and render

- [ ] **Storage path** writable: uploads (local or S3) and `public/temp` (or equivalent) for rendered MP4s.
- [ ] **Remotion render** works end-to-end: run a test job from the Generate page; confirm video is created and playable. If render fails, check worker logs and Remotion/Node version on worker host.

---

## Errors and monitoring

- [ ] **500 responses** do not expose stack traces or API keys (production uses generic “Something went wrong” via `sanitizeErrorMessage`).
- [ ] **Job failures** store a clear message in `failedReason`; UI shows it when status is `failed`. No raw stack or secrets stored.
- [ ] **Logging:** Server-side errors logged (e.g. `logServerError`) so you can debug from logs.

---

## Quick smoke test

1. Hit **GET /api/health** (or your production base URL + `/api/health`) and confirm it returns 200 with a body like `{ status: "ok" }`. Use this URL as the health check in your host (Vercel, Railway, etc.) if supported.
2. Open production Generate page.
3. Enter one sentence (e.g. “Explain why coffee wakes you up in 30 seconds”).
4. Click Generate video.
5. Wait for status to become “Completed” (or “Failed” with a clear message).
6. If completed, play the video and confirm it’s correct.
7. If failed, check worker logs and fix env or code.

---

## Manual smoke-test checklist (options end-to-end)

Use 1–2 generations to confirm main options work without burning many Veo/API credits:

1. **Duration + captions off**

   - Set duration to **30s**, choose **No captions**.
   - Generate (e.g. "A 30 second explainer about the sky").
   - Expect: video length ~30s, **no on-screen subtitles**.

2. **Duration only (optional)**

   - Set duration to **40s** or **50s**, captions on.
   - Generate and confirm output length is in the right ballpark.

3. **Mode**

   - Switch to **Talking object**, keep duration 30s.
   - Generate; expect a talking-character video (or failure with clear message if Veo/ffmpeg not configured).

4. **URL override**
   - Open `/generate?captions=off` and confirm the UI shows "No captions" selected; then generate to confirm no subtitles in the output.

---

## Legal / license

- [ ] **License** understood: CUTLINE is under the [MIT License](../LICENSE). See the [README License section](https://github.com/parbhatkapila4/cutline#license) for details.

---

When all items are checked, the deployment is ready for demos and portfolio use.
