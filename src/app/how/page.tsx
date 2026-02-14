import Link from "next/link";

export default function HowPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-start">
        <Link
          href="/"
          className="text-sm font-medium text-white border border-white/20 hover:bg-white/5 px-4 py-2 rounded-lg transition-colors"
        >
          Home page
        </Link>
      </div>

      <main className="pt-20 pb-24">
        <div className="max-w-4xl mx-auto px-6">

          <section className="mb-16">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4">
              How CUTLINE works
            </h1>
            <p className="text-xl text-zinc-400 leading-relaxed max-w-2xl mb-6">
              You give one sentence describing what you want the video to do—for example, “Explain why coffee makes you feel awake in 30 seconds” or “A short product teaser for our new API.” CUTLINE turns that into a finished short video: script, voiceover, images, motion, and subtitles. No templates, no storyboards; the system acts as both director and editor.
            </p>
            <p className="text-zinc-500 text-sm max-w-2xl">
              This page walks through the pipeline, the tech behind it, how to pick models, the two video modes, and how jobs are run in the background. Use the links below to jump to a section.
            </p>
          </section>


          <nav className="mb-20 rounded-2xl border border-white/10 bg-white/2 p-6" aria-label="Page sections">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">On this page</h2>
            <ul className="space-y-2 text-sm">
              {[
                { id: "pipeline", label: "Pipeline: from sentence to video" },
                { id: "stages", label: "What each pipeline stage does" },
                { id: "tech", label: "What CUTLINE uses (tech stack)" },
                { id: "models", label: "How to choose and change AI models" },
                { id: "modes", label: "Slideshow vs Talking object" },
                { id: "jobs", label: "How jobs run: submit, worker, poll" },
                { id: "inputs", label: "Optional inputs you can send" },
                { id: "env", label: "Environment variables" },
              ].map(({ id, label }) => (
                <li key={id}>
                  <a href={`#${id}`} className="text-zinc-400 hover:text-white transition-colors">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>


          <section className="mb-20" id="pipeline">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Pipeline: from sentence to video
            </h2>
            <p className="text-zinc-400 mb-6 leading-relaxed">
              The video is built in a single linear pipeline: 12 stages run one after another. Each stage uses the output of the previous one. If any stage fails, the whole job fails (though the system retries a few times for things like temporary API errors). There are no branches or optional paths—every slideshow video goes through the same sequence so behavior is predictable and debuggable.
            </p>
            <div className="rounded-2xl border border-white/10 bg-white/2 p-6 sm:p-8 font-mono text-sm overflow-x-auto">
              <div className="space-y-2 text-zinc-300">
                <div><span className="text-zinc-500">Input</span> → Your one sentence (e.g. “Explain why coffee makes you feel awake in 30 seconds”)</div>
                <div className="border-l-2 border-blue-500/50 pl-4 mt-4">1. Intent</div>
                <div className="border-l-2 border-blue-500/50 pl-4">2. Narrative</div>
                <div className="border-l-2 border-blue-500/50 pl-4">3. Shots</div>
                <div className="border-l-2 border-blue-500/50 pl-4">4. Script</div>
                <div className="border-l-2 border-blue-500/50 pl-4">5. Subtitles (draft)</div>
                <div className="border-l-2 border-blue-500/50 pl-4">6. TTS (voice)</div>
                <div className="border-l-2 border-blue-500/50 pl-4">7. Subtitle refine</div>
                <div className="border-l-2 border-blue-500/50 pl-4">8. Motion</div>
                <div className="border-l-2 border-blue-500/50 pl-4">9. Asset analysis (if you uploaded assets)</div>
                <div className="border-l-2 border-blue-500/50 pl-4">10. Visuals</div>
                <div className="border-l-2 border-blue-500/50 pl-4">11. Image sourcing</div>
                <div className="border-l-2 border-emerald-500/50 pl-4">12. Remotion render</div>
                <div className="mt-4 text-zinc-500">Output → <code className="text-zinc-400">/temp/[jobId].mp4</code></div>
              </div>
            </div>
          </section>


          <section className="mb-20" id="stages">
            <h2 className="text-2xl font-semibold text-white mb-4">
              What each pipeline stage does
            </h2>
            <p className="text-zinc-400 mb-8 leading-relaxed">
              Here’s what happens at each step and why it matters for the final video.
            </p>
            <div className="space-y-6">
              {[
                {
                  num: "1. Intent",
                  title: "Understanding your sentence",
                  body: "An AI (via OpenRouter) reads your one sentence and turns it into a structured “intent”: who the video is for, what it’s trying to achieve (e.g. explain, persuade, tease), the tone (professional, casual, etc.), how complex the topic is, and how long the video should be. If you don’t say a duration, the system infers one. Everything later in the pipeline uses this intent.",
                },
                {
                  num: "2. Narrative",
                  title: "Planning the story",
                  body: "From the intent, the same AI plans the narrative: a simple arc (e.g. hook → explanation → conclusion), 3–5 beats, and pacing. This is an internal plan, not something you see—it’s used to decide what each shot will be and what the script will say.",
                },
                {
                  num: "3. Shots",
                  title: "Breaking the video into shots",
                  body: "The AI produces a list of 8–12 shots. For each shot it decides: purpose (e.g. establish, reveal, transition), how long it lasts, how much text it carries, and how it connects to the previous and next shot. This is the “edit decision list” that drives both the script and the final cut.",
                },
                {
                  num: "4. Script",
                  title: "Writing what’s spoken",
                  body: "The AI writes the actual words (or silence) for each shot, aligned to the shot list. So you get one script entry per shot, with text that will be spoken by the TTS voice or left silent. This script is what gets turned into audio and subtitles.",
                },
                {
                  num: "5. Subtitles (draft)",
                  title: "Chunking and rough timing",
                  body: "The script is split into subtitle-sized chunks and given an estimated duration per chunk. This is a first pass; the real timing comes after TTS, when we know exactly when each word is spoken.",
                },
                {
                  num: "6. TTS (text-to-speech)",
                  title: "Generating the voiceover",
                  body: "Each script segment is sent to ElevenLabs or PlayHT. They return audio (and, where supported, word-level timings). Segments with no text get silence. The result is one continuous audio track plus timing data used to refine subtitles.",
                },
                {
                  num: "7. Subtitle refine",
                  title: "Syncing subtitles to the voice",
                  body: "Using the word timings from TTS, subtitle chunks are adjusted so they appear and disappear in sync with what’s actually spoken. That way captions match the voice instead of being based only on estimates.",
                },
                {
                  num: "8. Motion",
                  title: "How each shot moves",
                  body: "From the shot list, the system computes a “motion spec” per shot: e.g. scale, pan, zoom. No AI here—it’s rules based on shot purpose and order. This drives how the image is animated in the final render.",
                },
                {
                  num: "9. Asset analysis",
                  title: "Understanding your uploads (optional)",
                  body: "If you uploaded a logo, product photos, or reference media, an AI with vision looks at them and extracts: dominant colors, aspect ratio, suggested placement (e.g. logo as watermark or in outro), and for product photos, suggested shot types. This feeds into the visual style and image sourcing.",
                },
                {
                  num: "10. Visuals",
                  title: "Overall look and layout",
                  body: "From the intent and any analyzed assets, the system decides the visual spec: colors, layout tendencies. Again, this is in-process logic (no extra API call), and it guides how the Remotion composition looks.",
                },
                {
                  num: "11. Image sourcing",
                  title: "Getting an image for every shot",
                  body: "Every shot needs an image. For each shot, the AI (OpenRouter) suggests a search query or image prompt. The system then tries, in order: Unsplash (stock photos), DALL·E 3 (AI-generated), Pexels (another stock source), and if needed a simplified query. If everything fails, a placeholder image is used so the video still renders. If you uploaded product photos, some shots may be assigned those instead.",
                },
                {
                  num: "12. Remotion render",
                  title: "Assembling the final video",
                  body: "Remotion (React-based video framework) takes the script, shot list, subtitles, motion spec, image URLs, and TTS audio and renders a single MP4. Output is written to public/temp/[jobId].mp4 and served at /temp/[jobId].mp4.",
                },
              ].map((item) => (
                <div key={item.num} className="rounded-xl border border-white/10 bg-white/2 p-5 sm:p-6">
                  <div className="text-blue-400 font-mono text-sm mb-1">{item.num}</div>
                  <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </section>


          <section className="mb-20" id="tech">
            <h2 className="text-2xl font-semibold text-white mb-4">
              What CUTLINE uses (tech stack)
            </h2>
            <p className="text-zinc-400 mb-8 leading-relaxed">
              A quick reference for the main technologies and services. All of these are configurable via environment variables or (where noted) per-job options.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { name: "Next.js 16", role: "The app and API: App Router, React 19, API routes for generate, assets, and job status. The web UI and the Remotion composition share the same stack." },
                { name: "OpenRouter", role: "One API for many LLMs. Used for Intent, Narrative, Shots, Script, image-query derivation, and asset analysis. You set a default model in .env and can override it per job with the Text model dropdown or the textModel API field." },
                { name: "ElevenLabs / PlayHT", role: "Text-to-speech. You choose one provider via TTS_PROVIDER. They return audio and (where available) word timings so subtitles can be refined. Set the relevant API keys and voice ID in .env." },
                { name: "Unsplash, Pexels, DALL·E 3", role: "Images for each shot. The pipeline tries Unsplash first, then DALL·E, then Pexels, then a simplified query. At least one stock source (Unsplash or Pexels) is required; OpenAI is recommended for a strong fallback." },
                { name: "Remotion 4", role: "Programmatic video. The final MP4 is rendered by Remotion from a React composition: it layers images, motion, subtitles, and audio into one file. Same codebase as the app, so rendering is deterministic and easy to reason about." },
                { name: "BullMQ + Redis", role: "Background jobs. When you submit a video, a job is added to a queue. A separate worker process (npm run worker) runs the pipeline. Redis stores the queue and is also used for rate limiting. You must run Redis (locally or a managed service) for generation to work." },
                { name: "Google Veo (optional)", role: "Used only in “Talking object” mode: AI-generated talking character clips. Requires GEMINI_API_KEY. For videos longer than ~8 seconds, multiple clips are stitched with ffmpeg." },
                { name: "Storage", role: "Uploads can be stored on disk (local) or in S3. There is no database for pipeline state—job status lives in Redis. Rendered videos and temp assets are cleaned up automatically based on retention settings." },
              ].map((item, i) => (
                <div key={i} className="rounded-xl border border-white/10 bg-white/2 p-4">
                  <h3 className="font-semibold text-white mb-1">{item.name}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{item.role}</p>
                </div>
              ))}
            </div>
          </section>


          <section className="mb-20" id="models">
            <h2 className="text-2xl font-semibold text-white mb-4">
              How to choose and change AI models
            </h2>
            <p className="text-zinc-400 mb-6 leading-relaxed">
              Every AI step in the pipeline (Intent, Narrative, Shots, Script, image-query derivation, and asset analysis) goes through OpenRouter. So you have one place to control which “brain” is used: either a single default for all jobs, or a per-job override.
            </p>
            <div className="space-y-6 text-zinc-400 text-sm">
              <div className="rounded-xl border border-white/10 bg-white/2 p-5">
                <h3 className="font-semibold text-white mb-2">Default model (all jobs)</h3>
                <p className="mb-2">Set <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-300">OPENROUTER_MODEL</code> in <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-300">.env.local</code>. For example, <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-300">google/gemini-2.0-flash-lite-001</code> is a good default: fast and cheap. This model is used for every LLM stage unless you override it for a specific job.</p>
                <p className="text-zinc-500">For asset analysis (when you upload images), you can set <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-300">OPENROUTER_VISION_MODEL</code> to a vision-capable model. If you don’t, the same <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-300">OPENROUTER_MODEL</code> is used.</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/2 p-5">
                <h3 className="font-semibold text-white mb-2">Per-job override</h3>
                <p className="mb-2">On the main page, the “Text model” dropdown lets you pick a different model for that single video. When you start a job, the app sends <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-300">textModel</code> in the request body. That model is then used for every LLM stage in that job (Intent, Narrative, Shots, Script, image query, asset analysis). Useful when you want to try a more capable model for one video without changing .env.</p>
                <p className="text-zinc-500">You can use any model ID that OpenRouter supports (e.g. anthropic/claude-3.5-sonnet, openai/gpt-4o) as long as your OpenRouter API key has access.</p>
              </div>
            </div>
            <p className="text-zinc-400 mt-6 mb-2 text-sm">Example options in the dropdown (approximate limits are from the providers):</p>
            <div className="rounded-xl border border-white/10 bg-white/2 p-4 font-mono text-sm text-zinc-400 space-y-1">
              <div>• Default (from env) — uses OPENROUTER_MODEL</div>
              <div>• google/gemini-2.0-flash-exp — ~500/day</div>
              <div>• google/gemini-2.5-flash-preview-05-20 — ~10K/day</div>
              <div>• google/gemini-2.5-flash-image — ~2K/day</div>
              <div>• google/gemini-2.0-flash-lite-001 — default Gemini Flash Lite</div>
            </div>
          </section>

          <section className="mb-20" id="modes">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Slideshow vs Talking object
            </h2>
            <p className="text-zinc-400 mb-8 leading-relaxed">
              CUTLINE has two ways to produce a video. “Slideshow” is the full pipeline above: script, voice, stock or generated images, motion, subtitles, all composed in Remotion. “Talking object” skips that and uses Google Veo to generate a talking character that speaks your script—no slideshow, no image sourcing; just AI-generated video.
            </p>
            <div className="space-y-6">
              <div className="rounded-xl border border-white/10 bg-white/2 p-6">
                <h3 className="font-semibold text-white mb-2">Slideshow (default)</h3>
                <p className="text-zinc-400 text-sm leading-relaxed mb-3">
                  The full 12-stage pipeline runs. You get a classic short-form video: voiceover, one image per shot (from Unsplash/DALL·E/Pexels or your uploads), motion (pan, zoom, etc.), and subtitles. Duration is either inferred from your sentence or set by you (10–60 seconds) via the duration control or <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-300">durationSeconds</code> in the API.
                </p>
                <p className="text-zinc-500 text-sm">Best for: explainers, product teasers, social clips where you want a polished edit with voice and imagery.</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/2 p-6">
                <h3 className="font-semibold text-white mb-2">Talking object</h3>
                <p className="text-zinc-400 text-sm leading-relaxed mb-3">
                  The pipeline still does Intent → Narrative → Shots → Script so the script matches your intent. But instead of TTS + images + Remotion, the script (or chunks of it) is sent to Google Veo with a prompt like “Cartoon [subject] with a friendly face, talking to camera. Say the following: [script].” You get back a short video of an AI-generated character speaking. No image sourcing or Remotion for this mode.
                </p>
                <p className="text-zinc-400 text-sm leading-relaxed mb-3">
                  You need <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-300">GEMINI_API_KEY</code> in <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-300">.env.local</code>. Veo produces clips of roughly 8 seconds. For longer videos (e.g. 30 or 60 seconds), the system splits the script into ~8-second chunks, generates one Veo clip per chunk, then concatenates them with <strong className="text-zinc-300">ffmpeg</strong>. So for talking_object videos longer than 8 seconds, ffmpeg must be installed (on PATH or via <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-300">FFMPEG_PATH</code>). If the script is short for the requested duration, the system may extend the script so the video fills the length.
                </p>
                <p className="text-zinc-500 text-sm">Best for: character-driven explainers or fun, talking-avatar style clips when you don’t need a slideshow.</p>
              </div>
            </div>
          </section>

          <section className="mb-20" id="jobs">
            <h2 className="text-2xl font-semibold text-white mb-4">
              How jobs run: submit, worker, poll
            </h2>
            <p className="text-zinc-400 mb-6 leading-relaxed">
              Video generation can take a minute or more, so it runs in the background. The browser never waits for the pipeline to finish. Instead, you get a job ID immediately and the UI polls until the job is done. That requires Redis and a separate worker process—the Next.js app only creates jobs and returns status; it does not run the pipeline itself.
            </p>
            <div className="space-y-5 text-zinc-400 text-sm">
              <div className="flex gap-4">
                <span className="text-blue-400 font-mono shrink-0 font-semibold">1.</span>
                <div>
                  <p className="font-semibold text-zinc-300 mb-1">Submit</p>
                  <p>You enter your sentence (and optionally duration, mode, text model, assets) and hit create. The app sends <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-300">POST /api/generate</code> with your input. The API validates the input, applies rate limiting, then adds a job to the BullMQ queue and returns a <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-300">jobId</code>. Nothing has been rendered yet—the job is just queued.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="text-blue-400 font-mono shrink-0 font-semibold">2.</span>
                <div>
                  <p className="font-semibold text-zinc-300 mb-1">Worker</p>
                  <p>Somewhere (same machine or another server) you run <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-300">npm run worker</code>. That process connects to the same Redis, picks up jobs from the queue, and for each job runs the full pipeline (Intent through Remotion render, or the talking_object path). When it finishes, it writes the MP4 to <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-300">public/temp/[jobId].mp4</code> and marks the job completed. If something fails, the job is marked failed and the error is stored so the UI can show it.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="text-blue-400 font-mono shrink-0 font-semibold">3.</span>
                <div>
                  <p className="font-semibold text-zinc-300 mb-1">Poll</p>
                  <p>The UI calls <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-300">GET /api/generate/[jobId]</code> every few seconds. The API returns <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-300">status</code> (pending, processing, completed, or failed) and, when completed, the video URL (e.g. <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-300">/temp/[jobId].mp4</code>). When the status is completed or failed, the UI stops polling and either plays the video or shows the error.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="text-blue-400 font-mono shrink-0 font-semibold">4.</span>
                <div>
                  <p className="font-semibold text-zinc-300 mb-1">Cleanup</p>
                  <p>When the worker is running, a repeatable BullMQ job also runs periodically. It deletes old temp videos, expired uploads, and per-job image caches based on <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-300">VIDEO_RETENTION_HOURS</code>, <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-300">UPLOAD_RETENTION_HOURS</code>, and <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-300">CLEANUP_ENABLED</code>. So you don’t have to manually delete old files.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-20" id="inputs">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Optional inputs you can send
            </h2>
            <p className="text-zinc-400 mb-6 leading-relaxed">
              Besides the required one-sentence <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-300">input</code>, you can send these in the body of <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-300">POST /api/generate</code> (or use the controls on the main page / Generate page).
            </p>
            <ul className="space-y-4 text-zinc-400 text-sm">
              <li>
                <strong className="text-zinc-300">durationSeconds</strong> — A number between 10 and 60. Overrides the duration that would otherwise be inferred from your sentence. Used for both slideshow and talking_object.
              </li>
              <li>
                <strong className="text-zinc-300">assetIds</strong> — An array of strings: the IDs you got from <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-300">POST /api/assets/upload</code>. When present, the pipeline runs asset analysis (logo, product photos, reference media) and uses the results in the visual spec and image sourcing (e.g. assigning your product photos to certain shots).
              </li>
              <li>
                <strong className="text-zinc-300">brandColors</strong> — An object <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-300">{`{ primary: "hex", secondary?: "hex" }`}</code>. Passed into the visual spec so the composition can use your brand colors where appropriate.
              </li>
              <li>
                <strong className="text-zinc-300">mode</strong> — Either <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-300">"slideshow"</code> or <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-300">"talking_object"</code>. Default is slideshow.
              </li>
              <li>
                <strong className="text-zinc-300">textModel</strong> — An OpenRouter model ID (e.g. <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-300">google/gemini-2.5-flash-preview-05-20</code>). Overrides <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-300">OPENROUTER_MODEL</code> for this job only; every LLM stage in that job uses this model.
              </li>
            </ul>
          </section>

          <section className="mb-20" id="env">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Environment variables
            </h2>
            <p className="text-zinc-400 mb-6 leading-relaxed">
              Copy <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-300">.env.example</code> to <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-300">.env.local</code> and fill in the values. The README and <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-300">docs/IMAGE_API_KEYS.md</code> explain where to get each API key.
            </p>
            <div className="rounded-xl border border-white/10 bg-white/2 p-6 font-mono text-sm space-y-3 text-zinc-400">
              <div><span className="text-zinc-500"># Required for generation</span></div>
              <div><span className="text-amber-400/80">REDIS_URL</span> — Queue and rate limiting (e.g. redis://localhost:6379 or a managed Redis URL).</div>
              <div><span className="text-amber-400/80">OPENROUTER_API_KEY</span> — Used for every LLM stage (Intent, Narrative, Shots, Script, image query, asset analysis).</div>
              <div className="pt-2"><span className="text-zinc-500"># TTS — pick one provider</span></div>
              <div><span className="text-amber-400/80">ELEVENLABS_API_KEY</span> and <span className="text-amber-400/80">TTS_PROVIDER=elevenlabs</span> (and optionally ELEVENLABS_USE_MP3, TTS_VOICE_ID).</div>
              <div>Or <span className="text-amber-400/80">PLAYHT_API_KEY</span>, <span className="text-amber-400/80">PLAYHT_USER_ID</span>, and <span className="text-amber-400/80">TTS_PROVIDER=playht</span>.</div>
              <div className="pt-2"><span className="text-zinc-500"># Images — at least one stock source; DALL·E recommended as fallback</span></div>
              <div><span className="text-amber-400/80">UNSPLASH_ACCESS_KEY</span> and/or <span className="text-amber-400/80">PEXELS_API_KEY</span>; <span className="text-amber-400/80">OPENAI_API_KEY</span> for DALL·E 3.</div>
              <div className="pt-2"><span className="text-zinc-500"># Optional</span></div>
              <div><span className="text-amber-400/80">OPENROUTER_MODEL</span>, <span className="text-amber-400/80">OPENROUTER_VISION_MODEL</span> — default LLM (and vision model for asset analysis).</div>
              <div><span className="text-amber-400/80">GEMINI_API_KEY</span> — required only for talking_object mode (Veo).</div>
              <div><span className="text-amber-400/80">FFMPEG_PATH</span> — for talking_object videos longer than 8 seconds (concatenation).</div>
              <div><span className="text-amber-400/80">CLEANUP_ENABLED</span>, <span className="text-amber-400/80">VIDEO_RETENTION_HOURS</span>, <span className="text-amber-400/80">UPLOAD_RETENTION_HOURS</span>, <span className="text-amber-400/80">RATE_LIMIT_*</span> — tune cleanup and rate limits.</div>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
