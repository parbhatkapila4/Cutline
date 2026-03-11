import Link from "next/link";

const WHAT_YOU_GET = [
  { title: "One MP4, 10-60 seconds", desc: "A single video file you can download or share. Duration is inferred from your prompt or set by you. No trimming or export steps." },
  { title: "Script and voiceover", desc: "The system writes the script and generates AI voiceover (ElevenLabs or PlayHT). You get spoken copy that matches the narrative, no hiring a voice artist or recording yourself." },
  { title: "Images per shot", desc: "Every shot gets an image: sourced from stock (Unsplash, Pexels) or generated (DALL·E), or from your uploads. The pipeline picks; you don't hunt for B-roll." },
  { title: "Motion and pacing", desc: "Pan, zoom, and shot length are decided by the pipeline from the narrative. The edit feels intentional, not random or template-flat." },
  { title: "Synced subtitles", desc: "Captions are aligned to the voice using word-level timings from TTS. Viewers can watch with or without sound and still follow along." },
  { title: "No watermarks, no account", desc: "The video is yours. No \"upgrade to remove watermark\" or sign-up wall. Rate limits apply per session, but you can try the full flow without creating an account." },
];

const WHY_BETTER = [
  { title: "Not a template engine", body: "Template tools make you fill slots: title, three bullet points, CTA. Every video looks like the last one. CUTLINE directs each video from your sentence: narrative, shots, and script are generated for that prompt. Two different prompts produce two different videos, not two versions of the same layout." },
  { title: "No agency back-and-forth", body: "Briefs, revisions, and timelines go away. You don't send a script and wait for a cut; you send intent and get a cut. That's useful when you need something fast, iterative, or when budget doesn't allow for a full production cycle." },
  { title: "No DIY editing marathon", body: "You don't write a script, find stock clips, sync voice, and cut a timeline by hand. The pipeline does script, voice, images, motion, and subtitles. You stay at the \"what do I want to say?\" level; the system handles the \"how do we say it on screen?\" layer." },
  { title: "Deterministic and inspectable", body: "Same prompt and same system version tend to produce the same output. The pipeline is documented (see How it works); you can reason about what went wrong or what to change. No black box." },
];

const HOW_USEFUL = [
  { title: "Explainers and how-tos", body: "Turn \"Explain how X works in 45 seconds\" or \"A 30-second intro to our product\" into a short video. The system infers structure (hook, explanation, wrap) and picks visuals that support the script. Useful for onboarding, docs, or social education." },
  { title: "Product and feature teasers", body: "One sentence like \"Tease our new API launch\" or \"Show the main benefit of feature Y\" becomes a focused clip. Add optional product photos or a logo; the pipeline folds them into the edit. Good for launch content, landing pages, or internal updates." },
  { title: "Social and short-form", body: "You need a 15-60 second clip for Twitter, LinkedIn, or in-app. Describe the message; get an MP4 with voice, images, and subtitles. No need to book a designer or editor for every post." },
  { title: "Talking-avatar or character clips", body: "In \"Talking object\" mode, the system generates a talking character (e.g. cartoon) that speaks your script. Useful when you want a face and voice without being on camera: explainers, fun shorts, or character-driven content." },
  { title: "Rapid iteration", body: "Change the sentence and regenerate. Try different tones, lengths, or angles without rewriting a full script or re-briefing someone. Helpful when you're testing messaging or exploring formats." },
];

export default function BenefitsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Link
        href="/"
        className="fixed top-4 left-4 z-10 text-sm text-zinc-400 hover:text-white transition-colors border border-white/20 rounded-lg px-3 py-2 hover:bg-white/5"
      >
        Back to home
      </Link>
      <main>

        <section className="relative py-24 px-6 overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-b from-violet-950/40 via-transparent to-transparent pointer-events-none" />
          <div className="relative max-w-3xl mx-auto text-center">
            <p className="text-violet-400 text-sm font-medium uppercase tracking-widest mb-4">Why CUTLINE</p>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white mb-6 leading-[1.1]">
              What you get.
              <br />
              <span className="text-zinc-500">Why it’s better.</span>
            </h1>
            <p className="text-lg text-zinc-400 leading-relaxed">
              One sentence → finished video. Here’s the outcome, the edge over templates and agencies, and how to use it.
            </p>
          </div>
        </section>


        <section className="py-16 px-6 bg-black" id="what-you-get">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white">What you get</h2>
                <p className="text-zinc-500 mt-2 max-w-xl">Every run produces a single, ready-to-use asset. No assembly required.</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {WHAT_YOU_GET.map((item, i) => (
                <div key={i} className="group pl-6 border-l-2 border-zinc-800 hover:border-violet-500/50 transition-colors">
                  <span className="inline-block text-xs font-mono text-zinc-500 mb-2">0{i + 1}</span>
                  <h3 className="font-semibold text-white mb-2 group-hover:text-violet-300 transition-colors">{item.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>


        <section className="py-16 px-6" id="why-better">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Why it’s better</h2>
            <p className="text-zinc-500 mb-12 max-w-2xl">Compared to templates, agencies, or DIY editing, CUTLINE removes whole layers of work.</p>
            <div className="space-y-1">
              {WHY_BETTER.map((item, i) => (
                <div
                  key={i}
                  className={`flex gap-8 py-8 ${i % 2 === 0 ? "flex-row" : "flex-row-reverse"} border-b border-white/5 last:border-0`}
                >
                  <div className="w-24 shrink-0 text-4xl font-bold text-zinc-800 tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 px-6 bg-black" id="how-useful">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">How it’s useful</h2>
            <p className="text-zinc-500 mb-12 max-w-2xl">Concrete ways to use CUTLINE so you can ship video without building a production process.</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {HOW_USEFUL.map((item, i) => (
                <div
                  key={i}
                  className={`rounded-2xl p-6 ${i === 0 ? "sm:col-span-2 lg:col-span-2 bg-violet-500/10 border border-violet-500/20" : "bg-white/5 border border-white/5"}`}
                >
                  <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>


        <section className="py-16 px-6" id="time-cost">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Time and cost</h2>
            <p className="text-zinc-500 mb-12 max-w-2xl">What to expect when you run a job, and what you don’t have to pay or sign up for.</p>
            <div className="grid md:grid-cols-3 gap-8 md:gap-12">
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Time to first video</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">Generation runs in the background (usually 1-3 minutes). You get a job ID right away and the UI polls until the video is ready. No blocking; when it’s done, you get a link to the MP4.</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">No account or credit card</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">You can create videos without signing up. Rate limits apply per session. If you run CUTLINE yourself, you pay for the APIs (OpenRouter, TTS, image sources); the app doesn’t charge you.</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Your video, no lock-in</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">Output is a standard MP4. No watermarks, no “export with branding.” You own the file. Cleanup can delete old temp files after a retention window; until then, you can download and keep what you need.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-6 bg-black" id="flexibility">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Flexibility and control</h2>
            <p className="text-zinc-500 mb-10 max-w-2xl">You’re not stuck with one style or one length. Optional inputs and modes let you tune the output.</p>
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                { key: "Duration", text: "Set 10-60 seconds so the video matches your channel or format instead of relying only on inferred length." },
                { key: "Mode", text: "Choose slideshow (voice + images + motion + subtitles) or talking object (AI-generated talking character). Same intent, different output style." },
                { key: "Assets", text: "Upload a logo, product photos, or reference media; the pipeline analyzes them and uses them in the visual spec and image sourcing. Brand colors (hex) can be passed in." },
                { key: "Model", text: "Override the default LLM per job (e.g. use a stronger model for one video). All text stages use that model so you can trade cost for quality when it matters." },
              ].map(({ key, text }) => (
                <div key={key} className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0 text-violet-400 font-semibold text-sm">
                    {key.slice(0, 1)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">{key}</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 px-6" id="who-its-for">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Who it’s for</h2>
            <p className="text-zinc-500 mb-12 max-w-2xl">CUTLINE fits best when you want to ship short video without building or buying a full production workflow.</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { who: "Founders and makers", desc: "You need explainers, teasers, or social clips but don't have a video team. One sentence and a few minutes get you a shareable MP4." },
                { who: "Content and marketing", desc: "You're testing formats or message angles. Iterate by changing the prompt instead of re-briefing or re-editing." },
                { who: "Developers and technical teams", desc: "You're comfortable with APIs and env vars. You can run the worker, plug in your keys, and read How it works to understand or extend the pipeline." },
                { who: "Anyone who’d rather write intent than edit timelines", desc: "If your bottleneck is \"I know what I want to say, I don't want to cut it,\" CUTLINE takes the cut off your plate." },
              ].map((item, i) => (
                <div key={i} className="rounded-2xl p-6 bg-linear-to-br from-white/5 to-transparent border border-white/5">
                  <h3 className="font-semibold text-white mb-2">{item.who}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
