import Link from "next/link";

export default function FeaturesPage() {
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
              CUTLINE features
            </h1>
            <p className="text-xl text-zinc-400 leading-relaxed max-w-2xl mb-6">
              CUTLINE turns a single sentence into a finished short video: script, voiceover, images, motion, and subtitles. No templates, no storyboards. The system acts as both director and editor. This page explains what it does, what makes it different, and what you can control.
            </p>
            <p className="text-zinc-500 text-sm max-w-2xl">
              All of the following is a factual description of how CUTLINE works. Use the links below to jump to a section.
            </p>
          </section>

          <nav className="mb-20 rounded-2xl border border-white/10 bg-white/2 p-6" aria-label="Page sections">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">On this page</h2>
            <ul className="space-y-2 text-sm">
              {[
                { id: "different", label: "What makes CUTLINE different" },
                { id: "one-sentence", label: "One sentence to full video" },
                { id: "pipeline", label: "End-to-end pipeline (no handoffs)" },
                { id: "modes", label: "Two output modes: slideshow and talking object" },
                { id: "script-voice", label: "AI script and natural voiceover" },
                { id: "visuals", label: "Image sourcing and motion" },
                { id: "subtitles", label: "Auto subtitles synced to voice" },
                { id: "optional", label: "Optional inputs: duration, assets, brand, model" },
                { id: "background", label: "Background jobs and polling" },
              ].map(({ id, label }) => (
                <li key={id}>
                  <a href={`#${id}`} className="text-zinc-400 hover:text-white transition-colors">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <section className="mb-20" id="different">
            <h2 className="text-2xl font-semibold text-white mb-4">
              What makes CUTLINE different
            </h2>
            <p className="text-zinc-400 mb-6 leading-relaxed">
              Most video tools ask you to pick a template, upload clips, or build a storyboard. CUTLINE does not. You give one sentence describing what you want the video to do (e.g. “Explain why coffee makes you feel awake in 30 seconds” or “A short product teaser for our new API”). The system then runs a fixed pipeline: it infers intent, plans the narrative, breaks it into shots, writes the script, generates voiceover, sources or generates images for each shot, adds motion and subtitles, and renders a single MP4. There are no branches or optional paths: every slideshow video goes through the same sequence, so behavior is predictable and debuggable.
            </p>
            <p className="text-zinc-400 leading-relaxed">
              You can optionally set duration (10-60 seconds), upload assets (logo, product photos), pass brand colors, or choose a different AI model for that job. But the core value is: one sentence in, one video out, with no manual editing steps required.
            </p>
          </section>

          <section className="mb-20" id="one-sentence">
            <h2 className="text-2xl font-semibold text-white mb-4">
              One sentence to full video
            </h2>
            <p className="text-zinc-400 mb-6 leading-relaxed">
              The only required input is a single sentence. The system uses it to decide who the video is for, what it’s trying to achieve (explain, persuade, tease, etc.), the tone (professional, casual), how complex the topic is, and how long the video should be. If you don’t specify a duration, it is inferred. Everything downstream (narrative, shots, script, pacing, and visuals) is derived from that intent. So you don’t have to write a script, pick images, or time subtitles yourself; the pipeline does it.
            </p>
          </section>

          <section className="mb-20" id="pipeline">
            <h2 className="text-2xl font-semibold text-white mb-4">
              End-to-end pipeline (no handoffs)
            </h2>
            <p className="text-zinc-400 mb-6 leading-relaxed">
              The video is built in one linear pipeline of 12 stages. Each stage uses the output of the previous one. The stages are: Intent → Narrative → Shots → Script → Subtitles (draft) → TTS (voice) → Subtitle refine → Motion → Asset analysis (if you uploaded assets) → Visuals → Image sourcing → Remotion render. If any stage fails, the whole job fails (with retries for temporary API errors). There are no manual handoffs: you submit once and the worker runs the full pipeline until the MP4 is written.
            </p>
          </section>

          <section className="mb-20" id="modes">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Two output modes: slideshow and talking object
            </h2>
            <p className="text-zinc-400 mb-6 leading-relaxed">
              CUTLINE has two ways to produce a video. Both start from your one sentence and the same early stages (Intent, Narrative, Shots, Script).
            </p>
            <div className="space-y-6">
              <div className="rounded-xl border border-white/10 bg-white/2 p-6">
                <h3 className="font-semibold text-white mb-2">Slideshow (default)</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  The full 12-stage pipeline runs. You get a short-form video with voiceover, one image per shot (from Unsplash, DALL·E 3, Pexels, or your uploads), motion (pan, zoom, etc.), and subtitles. Duration is inferred or set by you (10-60 seconds). Best for explainers, product teasers, and social clips where you want a polished edit with voice and imagery.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/2 p-6">
                <h3 className="font-semibold text-white mb-2">Talking object</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Instead of TTS + images + Remotion, the script is sent to Google Veo to generate a talking character that speaks your script. No image sourcing or slideshow; just AI-generated video of a character talking. Requires GEMINI_API_KEY. Veo produces clips of roughly 8 seconds; for longer videos the system splits the script into chunks, generates one clip per chunk, and concatenates them with ffmpeg. Best for character-driven explainers or talking-avatar style clips.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-20" id="script-voice">
            <h2 className="text-2xl font-semibold text-white mb-4">
              AI script and natural voiceover
            </h2>
            <p className="text-zinc-400 mb-6 leading-relaxed">
              From the intent, the system plans the narrative (e.g. hook → explanation → conclusion), then breaks it into 8-12 shots and writes the actual words for each shot. That script is sent to ElevenLabs or PlayHT (you choose one provider via TTS_PROVIDER). They return audio and, where supported, word-level timings. So you get a single continuous voiceover that matches the tone and length of your request, with no manual script writing or voice recording.
            </p>
          </section>

          <section className="mb-20" id="visuals">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Image sourcing and motion
            </h2>
            <p className="text-zinc-400 mb-6 leading-relaxed">
              Every shot needs an image. For each shot, the AI suggests a search query or image prompt. The system then tries, in order: Unsplash (stock), DALL·E 3 (AI-generated), Pexels (stock), and if needed a simplified query. If everything fails, a placeholder is used so the video still renders. If you uploaded product photos or a logo, the asset-analysis stage can assign some shots to your uploads and use extracted colors and layout hints. Motion (scale, pan, zoom) per shot is computed from the shot list and applied in the Remotion composition. No AI for motion, just rules based on shot purpose and order.
            </p>
          </section>

          <section className="mb-20" id="subtitles">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Auto subtitles synced to voice
            </h2>
            <p className="text-zinc-400 mb-6 leading-relaxed">
              The script is chunked into subtitle-sized segments and given an initial timing estimate. After TTS, word-level timings from the provider are used to refine when each subtitle appears and disappears, so captions stay in sync with what is actually spoken. You don’t have to time or edit subtitles manually.
            </p>
          </section>

          <section className="mb-20" id="optional">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Optional inputs: duration, assets, brand, model
            </h2>
            <p className="text-zinc-400 mb-6 leading-relaxed">
              Besides the required one-sentence input, you can send:
            </p>
            <ul className="space-y-3 text-zinc-400 text-sm mb-6">
              <li><strong className="text-zinc-300">durationSeconds</strong>: A number between 10 and 60. Overrides the inferred duration for both slideshow and talking_object.</li>
              <li><strong className="text-zinc-300">assetIds</strong>: IDs from POST /api/assets/upload. The pipeline runs asset analysis (logo, product photos) and uses the results in the visual spec and image sourcing.</li>
              <li><strong className="text-zinc-300">brandColors</strong>: primary (and optional secondary) hex colors passed into the visual spec.</li>
              <li><strong className="text-zinc-300">mode</strong>: &quot;slideshow&quot; or &quot;talking_object&quot;. Default is slideshow.</li>
              <li><strong className="text-zinc-300">textModel</strong>: An OpenRouter model ID. Overrides the default for that job only; every LLM stage in that job uses this model.</li>
            </ul>
            <p className="text-zinc-400 leading-relaxed">
              All of these are optional. The system works with just the one sentence if that’s all you provide.
            </p>
          </section>

          <section className="mb-20" id="background">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Background jobs and polling
            </h2>
            <p className="text-zinc-400 mb-6 leading-relaxed">
              Video generation can take a minute or more, so it runs in the background. When you submit, the API adds a job to a BullMQ queue (Redis) and returns a jobId immediately. A separate worker process (npm run worker) picks up jobs and runs the full pipeline. The UI polls GET /api/generate/[jobId] every few seconds until the status is completed or failed, then shows the video or the error. You never wait on the server for the full render: submit, get an ID, poll until done.
            </p>
            <p className="text-zinc-400 leading-relaxed">
              Rendered videos and temp assets are cleaned up automatically based on VIDEO_RETENTION_HOURS and related settings, so you don’t have to manually delete old files.
            </p>
          </section>

        </div>
      </main>
    </div>
  );
}
