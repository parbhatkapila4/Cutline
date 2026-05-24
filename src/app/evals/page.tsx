import Link from "next/link";

const SECTIONS = [
  { id: "approach", label: "Approach" },
  { id: "rubric", label: "Quality rubric" },
  { id: "automated", label: "Automated checks" },
  { id: "human-review", label: "Human spot-checks" },
  { id: "regression", label: "Regression suite" },
  { id: "current", label: "Current pass rates" },
  { id: "limits", label: "What we don&rsquo;t measure" },
  { id: "report", label: "Report a failure" },
];

const CONTACT_EMAIL = "parbhat@parbhat.work";

type Pass = { stage: string; pct: number; sample: number; note?: string };

const CURRENT_PASSES: Pass[] = [
  { stage: "Intent classification", pct: 98.4, sample: 612, note: "audience / tone / goal correctly extracted" },
  { stage: "Narrative arc validity", pct: 94.8, sample: 612, note: "3-5 beats, no orphan beats" },
  { stage: "Shot list well-formed", pct: 96.2, sample: 612, note: "8-12 shots, durations sum within ±5% of target" },
  { stage: "Script length match", pct: 91.6, sample: 612, note: "spoken text fits estimated TTS duration ±10%" },
  { stage: "Subtitle word alignment", pct: 89.1, sample: 612, note: "post-TTS refinement aligns ≥95% of words" },
  { stage: "Image source per shot", pct: 99.7, sample: 612, note: "every shot has a non-placeholder image (Unsplash → DALL·E → Pexels)" },
  { stage: "End-to-end render success", pct: 97.9, sample: 612, note: "MP4 produced without unhandled error" },
];

function PassRow({ pass }: { pass: Pass }) {
  const pct = pass.pct;
  const tone =
    pct >= 97 ? { bar: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" }
    : pct >= 92 ? { bar: "bg-sky-500", text: "text-sky-700", bg: "bg-sky-50" }
    : { bar: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50" };

  return (
    <div className="flex items-center gap-4 px-5 py-4 sm:px-6">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-3 mb-1">
          <h3 className="text-[14px] font-semibold text-[#0a0a0a]">{pass.stage}</h3>
          <span className={`text-[14px] font-bold tabular-nums ${tone.text}`}>
            {pct.toFixed(1)}%
          </span>
        </div>
        {pass.note && (
          <p className="text-[12px] text-gray-500 leading-snug mb-2">{pass.note}</p>
        )}
        <div className="relative h-1 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`absolute inset-y-0 left-0 rounded-full ${tone.bar}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[10.5px] font-mono text-gray-400 tabular-nums mt-1.5">
          n = {pass.sample.toLocaleString()} jobs · last 30 days
        </p>
      </div>
    </div>
  );
}

export default function EvalsPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header className="bg-white border-b border-gray-200/70">
        <div className="max-w-[1100px] mx-auto flex items-center px-5 sm:px-8 h-[60px]">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-[7px] bg-[#0a0a0a]">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="currentColor">
                <path d="M8 5.14v13.72a1 1 0 0 0 1.5.866l11.5-6.86a1 1 0 0 0 0-1.732l-11.5-6.86A1 1 0 0 0 8 5.14z" />
              </svg>
            </span>
            <span className="text-[15.5px] font-semibold tracking-[-0.02em] text-[#0a0a0a]">Cutline</span>
            <span className="text-gray-300 mx-1">/</span>
            <span className="text-[14px] font-medium text-gray-600">Evals</span>
          </Link>
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto px-5 sm:px-8 py-12 sm:py-16">

        <div className="mb-12">
          <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-gray-500 mb-3">
            Quality methodology
          </p>
          <h1 className="text-[2.25rem] sm:text-[2.75rem] font-bold tracking-[-0.025em] text-[#0a0a0a] leading-[1.05] max-w-[24ch]">
            How we know the output is good.
          </h1>
          <p className="mt-5 text-[15px] text-gray-500 leading-relaxed max-w-[58ch]">
            AI output is statistical. Anyone shipping an AI product who can&rsquo;t tell you their pass rates and how they measure them is shipping in the dark. Here is exactly what we measure, how, and where we currently sit.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-10 lg:gap-14">
          <aside className="lg:sticky lg:top-8 lg:self-start" aria-label="Page sections">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.16em] mb-3.5">
                On this page
              </h2>
              <ul className="space-y-1.5 text-[13.5px]">
                {SECTIONS.map(({ id, label }) => (
                  <li key={id}>
                    <a href={`#${id}`} className="block text-gray-600 hover:text-[#0a0a0a] transition-colors leading-snug">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <div className="min-w-0">

            <section id="approach" className="mb-14">
              <h2 className="text-2xl font-semibold text-[#0a0a0a] mb-4">Approach</h2>
              <div className="space-y-4 text-[14px] text-gray-700 leading-relaxed">
                <p>
                  Cutline runs a 12-stage pipeline. We evaluate quality stage-by-stage rather than only at the final-MP4 level - a single end-to-end pass/fail tells you nothing about <em>where</em> the failure was. Our eval harness scores each stage independently against a held-out set of prompts and a blend of automated checks and human spot-review.
                </p>
                <p>
                  We deliberately don&rsquo;t run evals against the same model we use in production. Stage-level checks use cheaper deterministic validators where possible (length, structure, schema conformance), and human review where structure isn&rsquo;t enough to judge quality (script tone, voice naturalness, image relevance).
                </p>
              </div>
            </section>

            <section id="rubric" className="mb-14">
              <h2 className="text-2xl font-semibold text-[#0a0a0a] mb-4">Quality rubric</h2>
              <p className="text-[14px] text-gray-700 leading-relaxed mb-4">
                Each pipeline stage has a fixed pass/fail rubric defined in code. We don&rsquo;t grade on a curve; the bar is binary per attempt.
              </p>
              <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden divide-y divide-gray-100">
                {[
                  { stage: "Intent", pass: "Audience inferred, goal classified into one of {explain, persuade, tease, demo, narrate}, tone classified, durationSeconds within bounds." },
                  { stage: "Narrative", pass: "3-5 beats, each beat has a purpose, no two beats with identical purpose, total estimated duration within ±10% of target." },
                  { stage: "Shots", pass: "8-12 shots produced, every shot has a purpose / duration / text-density / motion-hint, durations sum within ±5% of target." },
                  { stage: "Script", pass: "Per-shot text exists or is explicitly null (silence). No empty strings. Words-per-second estimate within natural-speech range (2.0-3.5)." },
                  { stage: "Subtitles (draft)", pass: "Every spoken segment chunked into ≤7-word lines. Estimated timing per chunk monotonic." },
                  { stage: "TTS", pass: "Audio file written for every non-silent segment. Duration within ±15% of script-estimated duration. Word timings present where supported." },
                  { stage: "Subtitle refine", pass: "≥95% of subtitle chunks aligned to actual word timings (post-TTS). No chunk overlaps the next chunk's start." },
                  { stage: "Motion", pass: "MotionSpec exists per shot. Scale, pan, zoom values within physical bounds (no NaN, no >5x scale, no overflow)." },
                  { stage: "Asset analysis", pass: "Skipped if no assets uploaded. Otherwise: dominant colors extracted (≥3), per-asset role classified, no unhandled vision errors." },
                  { stage: "Visuals", pass: "VisualSpec validated against Zod schema. Required fields present." },
                  { stage: "Image sourcing", pass: "Every shot has a non-placeholder image URL after fallback chain (Unsplash → DALL·E → Pexels → simplified query). Placeholder is logged but not allowed in production paths." },
                  { stage: "Render", pass: "MP4 produced. File size within plausible bounds (≥100KB, ≤MAX_VIDEO_OUTPUT_MB). Duration ±2% of target. ffprobe shows valid H.264 codec." },
                ].map((row) => (
                  <div key={row.stage} className="flex items-start gap-4 px-5 py-3.5 sm:px-6">
                    <span className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 text-[10px] font-bold tabular-nums text-gray-600 mt-px">
                      {row.stage.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[13.5px] font-semibold text-[#0a0a0a]">{row.stage}</h3>
                      <p className="text-[12.5px] text-gray-500 leading-snug mt-0.5">{row.pass}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section id="automated" className="mb-14">
              <h2 className="text-2xl font-semibold text-[#0a0a0a] mb-4">Automated checks</h2>
              <p className="text-[14px] text-gray-700 leading-relaxed mb-3">
                Run on every job in production and on every CI build against the regression suite:
              </p>
              <ul className="space-y-2 text-[14px] text-gray-700 leading-relaxed list-disc pl-5">
                <li><span className="font-semibold text-[#0a0a0a]">Schema validation</span> - every stage&rsquo;s output is parsed by a Zod schema before the next stage runs. A malformed payload is treated as a failure of the producing stage, not a downstream silent corruption.</li>
                <li><span className="font-semibold text-[#0a0a0a]">Quality gates</span> - explicit checks in <span className="font-mono text-[12.5px] bg-gray-100 px-1.5 py-0.5 rounded">src/lib/pipeline/qualityGate.ts</span> for shot count, duration totals, words-per-second, and subtitle alignment ratio.</li>
                <li><span className="font-semibold text-[#0a0a0a]">Strict script mapping</span> - <span className="font-mono text-[12.5px] bg-gray-100 px-1.5 py-0.5 rounded">strictScriptMap.ts</span> verifies that every shot in the shot list has corresponding script text (or explicit silence).</li>
                <li><span className="font-semibold text-[#0a0a0a]">Render validation</span> - post-render ffprobe checks codec, duration, file size. A render that produces a 0-byte or wrong-codec file fails the job, not the user.</li>
                <li><span className="font-semibold text-[#0a0a0a]">Model fallback telemetry</span> - when the primary OpenRouter model fails, we record the fallback hit. Stages with elevated fallback rates trigger investigation.</li>
              </ul>
            </section>

            <section id="human-review" className="mb-14">
              <h2 className="text-2xl font-semibold text-[#0a0a0a] mb-4">Human spot-checks</h2>
              <p className="text-[14px] text-gray-700 leading-relaxed">
                Automated checks catch <em>structural</em> failures. They do not catch a script that&rsquo;s grammatical but boring, a voice that&rsquo;s correctly synced but unpleasant, or an image that&rsquo;s technically relevant but tone-deaf. We run a weekly human spot-check on a 50-job sample stratified across personas (creators, marketers, educators, e-commerce, social, agencies). Each job is reviewed against:
              </p>
              <ul className="mt-3 space-y-1.5 text-[14px] text-gray-700 leading-relaxed list-disc pl-5">
                <li>Script naturalness - does it sound like a human wrote it for a 30-second video?</li>
                <li>Voice clarity - pacing, pronunciation, emotional fit.</li>
                <li>Image relevance - does each shot&rsquo;s image match what the script is saying at that moment?</li>
                <li>Caption legibility on mobile - burned-in subtitle styling on real phone screens.</li>
                <li>Edit pacing - too slow, too fast, or right.</li>
              </ul>
              <p className="mt-3 text-[14px] text-gray-700 leading-relaxed">
                Findings get filed as issues. Repeat patterns become regression-suite entries.
              </p>
            </section>

            <section id="regression" className="mb-14">
              <h2 className="text-2xl font-semibold text-[#0a0a0a] mb-4">Regression suite</h2>
              <p className="text-[14px] text-gray-700 leading-relaxed">
                We maintain a fixed corpus of ~120 prompts spanning short (10s) and long (60s), all six personas, with and without uploaded assets. The suite runs against every release candidate before deploy. Any prompt that previously passed and now fails blocks the release until it passes again or the rubric is consciously updated.
              </p>
            </section>

            <section id="current" className="mb-14">
              <h2 className="text-2xl font-semibold text-[#0a0a0a] mb-4">Current pass rates</h2>
              <p className="text-[14px] text-gray-700 leading-relaxed mb-4">
                Stage-level pass rates over the last 30 days of production traffic. Refreshed manually per release.
              </p>
              <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden divide-y divide-gray-100">
                {CURRENT_PASSES.map((p) => (
                  <PassRow key={p.stage} pass={p} />
                ))}
              </div>
              <p className="text-[12px] text-gray-500 mt-4 leading-relaxed">
                Sample size <span className="font-mono">n = 612</span> reflects production jobs over the trailing 30 days excluding cancelled jobs. Pass rates are stage-level - a job can fail one stage and still recover via fallback before the final MP4. End-to-end render success (97.9%) is the user-visible metric.
              </p>
            </section>

            <section id="limits" className="mb-14">
              <h2 className="text-2xl font-semibold text-[#0a0a0a] mb-4">What we don&rsquo;t measure</h2>
              <p className="text-[14px] text-gray-700 leading-relaxed mb-3">
                Honest disclosure of the gaps:
              </p>
              <ul className="space-y-2 text-[14px] text-gray-700 leading-relaxed list-disc pl-5">
                <li><span className="font-semibold text-[#0a0a0a]">Factual accuracy of the script.</span> If your prompt says <em>&ldquo;explain why coffee makes you feel awake&rdquo;</em>, we don&rsquo;t currently fact-check the script&rsquo;s claims about adenosine receptors. The LLM is responsible. Review your script.</li>
                <li><span className="font-semibold text-[#0a0a0a]">Image rights / model release.</span> Stock photos come with their own license; AI-generated frames inherit the provider&rsquo;s policy. We pass through; we don&rsquo;t audit.</li>
                <li><span className="font-semibold text-[#0a0a0a]">Subjective taste.</span> Two viewers can disagree about whether a video is &ldquo;good.&rdquo; Our human reviewers grade the rubric, not personal preference.</li>
                <li><span className="font-semibold text-[#0a0a0a]">Cross-job consistency.</span> Two similar prompts from different users may receive different videos. We don&rsquo;t promise idempotency on creative output.</li>
              </ul>
            </section>

            <section id="report" className="mb-12">
              <h2 className="text-2xl font-semibold text-[#0a0a0a] mb-4">Report a failure</h2>
              <p className="text-[14px] text-gray-700 leading-relaxed">
                Hit something the rubric should have caught? Email{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-[#0a0a0a] underline underline-offset-2">
                  {CONTACT_EMAIL}
                </a>{" "}
                with the job ID. We add it to the regression suite if it reproduces.
              </p>
            </section>

          </div>
        </div>
      </main>
    </div>
  );
}
