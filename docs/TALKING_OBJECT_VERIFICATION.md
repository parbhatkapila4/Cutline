# Talking-object video - verification checklist

Use this when testing or recording a demo to confirm everything works.

## 1. No black screen between chunks

**Location:** `src/lib/pipeline/concatMp4.ts`

- Chunks are joined with **1s crossfade** (video `xfade` + audio `acrossfade`), not with a black gap.
- If `acrossfade` fails (e.g. missing audio in a clip), **fallback** runs: video still uses `xfade` (no black), audio is trimmed and concatenated to match.
- Fallback trims use `dA`/`dB` with a minimum of 0.5s so atrim never gets invalid values.

**What to check:** Generate a talking-object video > 8s (e.g. 20-35s). Play it; there should be no 1-2s black pause between “speakers” or segments, only a short visual/audio crossfade.

---

## 2. Chunk syncing (continuous speech, no mid-sentence cut)

**Location:** `src/lib/pipeline/orchestrator.ts`

- **Script splitting:** `splitScriptIntoChunks` with `VEO_WORDS_PER_CHUNK = 18` so each 8s chunk has enough time to finish.
- Boundaries are **sentence-level** (`.!?`). Long sentences are split on **commas/semicolons** (or by word count if no punctuation).
- **Veo prompts** tell the model: first chunk = “opening… finish last word clearly”; middle = “continues directly… start immediately… in about 8 seconds”; last = “continues directly… end naturally”.

**What to check:** Same 20-35s video. Listen for:

- No cut in the middle of a sentence.
- Each segment ends with a complete phrase; next segment continues from the next phrase/sentence.

---

## 3. Captions for the full video

**Locations:**  
`src/lib/pipeline/orchestrator.ts` (single-clip and multi-clip caption timing)  
`src/lib/pipeline/burnSubtitles.ts` (SRT write + burn)

**Single-clip (≤ 8s):**

- Uses **actual file duration** from `getDuration(outputPath)`.
- Captions are spread evenly over the video; each has at least 800ms.
- Segments are capped so each caption is at least 1.5s of video (when possible).

**Multi-clip (> 8s):**

- Uses **actual final video duration** from `getDuration(outputPath)` after concat + music.
- If that fails, duration is computed from chunk durations minus crossfade.
- One caption per text chunk, spread evenly over the full duration; each caption at least 1s.
- Last caption’s `endMs` is clamped to video duration.

**Burn step:**

- Only entries with **duration ≥ 400ms** and **endMs > startMs** are written to SRT.
- If there are no valid entries, burning is skipped (no empty SRT, no ffmpeg error).

**What to check:** Generate with “With captions” on. Captions should:

- Appear across the **whole** video (no “only first second”).
- Each caption stays on screen for a visible time (no flash).
- No long stretch at the end with no captions.

---

## 4. Quick test plan for a single recording

1. **Settings:** Talking object, real person, **With captions**, duration **e.g. 24 or 35 seconds**.
2. **Prompt:** One clear sentence that implies a few sentences of speech (e.g. “Explain why solar panels are a good investment for homeowners”).
3. **After generation:**
   - **Black:** No black screen between segments; only smooth crossfade.
   - **Sync:** Speech flows segment to segment; no mid-sentence cut; next segment continues from where the last ended.
   - **Captions:** Visible for the full length; no “only first second”; no millisecond flash; coverage to the end of the video.

If any of these fail, check the logs for `[pipeline]` (concat, captions burned, background-music) and for ffmpeg/Veo errors.
