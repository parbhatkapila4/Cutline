# CUTLINE — Production checklist

Use this list before going live. Tick each item when verified.

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

1. Open production Generate page.
2. Enter one sentence (e.g. “Explain why coffee wakes you up in 30 seconds”).
3. Click Generate video.
4. Wait for status to become “Completed” (or “Failed” with a clear message).
5. If completed, play the video and confirm it’s correct.
6. If failed, check worker logs and fix env or code.

---

When all items are checked, the deployment is ready for demos and portfolio use.
