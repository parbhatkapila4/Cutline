import Link from "next/link";

type Tag = "shipped" | "improved" | "fixed" | "infra" | "api";

const TAG_STYLES: Record<Tag, { bg: string; text: string; label: string }> = {
  shipped: { bg: "bg-emerald-50 ring-emerald-200", text: "text-emerald-700", label: "Shipped" },
  improved: { bg: "bg-sky-50 ring-sky-200", text: "text-sky-700", label: "Improved" },
  fixed: { bg: "bg-amber-50 ring-amber-200", text: "text-amber-700", label: "Fixed" },
  infra: { bg: "bg-violet-50 ring-violet-200", text: "text-violet-700", label: "Infra" },
  api: { bg: "bg-gray-100 ring-gray-200", text: "text-gray-700", label: "API" },
};

type Entry = {
  date: string;
  version: string;
  title: string;
  summary: string;
  changes: { tag: Tag; text: string }[];
};

const ENTRIES: Entry[] = [
  {
    date: "May 10, 2026",
    version: "0.18",
    title: "Hero refresh + persistent session cache",
    summary:
      "Landing page rebuilt around a new editorial hero. Returning visitors now skip the auth-skeleton flash entirely.",
    changes: [
      { tag: "shipped", text: "New left-aligned hero with iridescent stepped diamond visual" },
      { tag: "shipped", text: "Persistent 'live' announcement bar at cutline.cloud" },
      { tag: "improved", text: "Refactored navigation header with status indicator and tighter spacing" },
      { tag: "improved", text: "useCachedSession() — localStorage-backed session preload kills the navbar skeleton on revisit" },
      { tag: "shipped", text: "Per-route loading.tsx skeletons across /create, /dashboard, /features, /how, /pricing, /privacy, /terms, /auth, /contact" },
    ],
  },
  {
    date: "May 9, 2026",
    version: "0.17",
    title: "Persona-tuned feature previews",
    summary:
      "Built-in Features section now adapts every card to the selected persona — Content Creators, Marketers, Educators, E-commerce, Social Media, Agencies.",
    changes: [
      { tag: "shipped", text: "Six persona presets driving Cards 1–3 (script, visuals, studio)" },
      { tag: "shipped", text: "Real Unsplash thumbnail tiles per persona, replacing gradient placeholders" },
      { tag: "improved", text: "Refined typography scale across the landing — Geist Sans + Georgia italic accents" },
    ],
  },
  {
    date: "May 8, 2026",
    version: "0.16",
    title: "Pipeline reliability — strict-script + dynamic frame mapping",
    summary:
      "Two changes that meaningfully cut transient failures on the script and render stages.",
    changes: [
      { tag: "infra", text: "Model fallback mechanism in strict script mapping — primary failure routes to a secondary OpenRouter model before erroring" },
      { tag: "infra", text: "Composition now computes shot start-frames dynamically from the timeline rather than from precomputed offsets" },
      { tag: "improved", text: "Dashboard video detail page — simplified category metadata structure" },
    ],
  },
  {
    date: "May 7, 2026",
    version: "0.15",
    title: "Talking-object mode + branded overlays",
    summary:
      "Real talking-video output mode shipped (Veo-backed) plus a per-job logo overlay layer.",
    changes: [
      { tag: "shipped", text: "Talking Real Mode option on the video job pipeline" },
      { tag: "shipped", text: "Logo overlay component — configurable placement on the final composition" },
      { tag: "shipped", text: "Captioned video component for the slideshow path" },
      { tag: "infra", text: "Redis-based snapshot store for regen snapshots — save / load / delete" },
    ],
  },
  {
    date: "May 5, 2026",
    version: "0.14",
    title: "Subtitles + error messaging pass",
    summary:
      "Subtitle layout now wraps on natural breaks, and every user-facing error message was rewritten to say what to do next.",
    changes: [
      { tag: "improved", text: "Subtitle line-wrapping for readability on portrait formats" },
      { tag: "improved", text: "Refined error messages for service-availability and authentication failures" },
      { tag: "fixed", text: "Submit timeout extended to handle slower upstream LLM cold-starts" },
    ],
  },
  {
    date: "May 4, 2026",
    version: "0.13",
    title: "Cinematic scenes + DODO Payments",
    summary:
      "Pro and Enterprise tiers gained a cinematic-scenes mode; checkout migrated to DODO Payments.",
    changes: [
      { tag: "shipped", text: "Cinematic scenes support gated to Pro / Enterprise" },
      { tag: "shipped", text: "DODO Payments checkout replacing the prior flow" },
      { tag: "infra", text: "Retry utility functions across the pipeline + user-plan fallback logic in planService" },
      { tag: "improved", text: "Account menu — click-outside + escape-to-close handling" },
    ],
  },
  {
    date: "May 2, 2026",
    version: "0.12",
    title: "Stable error codes + talking-video options",
    summary:
      "API responses now carry a stable UPPER_SNAKE_CASE error code clients can branch on; talking-video adds new option types.",
    changes: [
      { tag: "api", text: "All error responses carry { error, code, details? } with stable codes" },
      { tag: "shipped", text: "Talking video creation flow with new option set" },
      { tag: "infra", text: "Shot planning — model fallback + tightened request handling" },
    ],
  },
  {
    date: "Apr 30, 2026",
    version: "0.11",
    title: "Quality report on every webhook",
    summary:
      "The job-completion webhook now includes a quality_report block for downstream consumers.",
    changes: [
      { tag: "api", text: "Webhook payload extended with quality_report (per-stage success, retries, fallback hits)" },
      { tag: "shipped", text: "Variation strategies for content generation" },
      { tag: "improved", text: "Removed legacy aspect-ratio docs in favor of code-derived constants" },
    ],
  },
  {
    date: "Apr 29, 2026",
    version: "0.10",
    title: "Remix from existing job",
    summary:
      "Users can now produce a new video from a prior job's script + subtitles + voice without re-running the LLM stages.",
    changes: [
      { tag: "shipped", text: "Remix functionality on completed video jobs" },
      { tag: "shipped", text: "Slideshow tail generation from existing subtitles" },
      { tag: "infra", text: "Simplified Redis connection management — single creation path" },
    ],
  },
  {
    date: "Apr 27, 2026",
    version: "0.9",
    title: "Background-job ergonomics",
    summary:
      "Job processing got proper status types, polling intervals as constants, and shared UI labels.",
    changes: [
      { tag: "infra", text: "Constants module for job status, polling, and UI labels — single source of truth" },
      { tag: "shipped", text: "Per-route loading and error components" },
      { tag: "fixed", text: "Free-plan API limit corrected from 0 to 1 generation" },
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header className="bg-white border-b border-gray-200/70">
        <div className="max-w-[960px] mx-auto flex items-center px-5 sm:px-8 h-[60px]">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-[7px] bg-[#0a0a0a]">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="currentColor">
                <path d="M8 5.14v13.72a1 1 0 0 0 1.5.866l11.5-6.86a1 1 0 0 0 0-1.732l-11.5-6.86A1 1 0 0 0 8 5.14z" />
              </svg>
            </span>
            <span className="text-[15.5px] font-semibold tracking-[-0.02em] text-[#0a0a0a]">Cutline</span>
            <span className="text-gray-300 mx-1">/</span>
            <span className="text-[14px] font-medium text-gray-600">Changelog</span>
          </Link>
        </div>
      </header>

      <main className="max-w-[960px] mx-auto px-5 sm:px-8 py-12 sm:py-16">

        <div className="mb-12">
          <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-gray-500 mb-3">
            Changelog
          </p>
          <h1 className="text-[2.25rem] sm:text-[2.75rem] font-bold tracking-[-0.025em] text-[#0a0a0a] leading-[1.05]">
            What&rsquo;s new in Cutline
          </h1>
          <p className="mt-4 text-[15px] text-gray-500 leading-relaxed max-w-[60ch]">
            We ship continuously. Most weeks bring a pipeline fix, a UI refinement, or a new mode. This is the public log of what changed and when.
          </p>
        </div>

        <div className="relative">
          <div className="absolute left-[3px] top-3 bottom-3 w-px bg-gray-200" aria-hidden />

          <ol className="space-y-12">
            {ENTRIES.map((entry) => (
              <li key={entry.version} className="relative pl-9">
                <span
                  className="absolute left-0 top-2 w-[7px] h-[7px] rounded-full bg-[#0a0a0a] ring-[3px] ring-[#FAFAFA]"
                  aria-hidden
                />
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
                  <time className="text-[12px] font-mono tracking-tight text-gray-500 tabular-nums">
                    {entry.date}
                  </time>
                  <span className="text-[10.5px] font-bold tracking-[0.16em] uppercase text-gray-400">
                    v{entry.version}
                  </span>
                </div>
                <h2 className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.015em] text-[#0a0a0a] leading-snug mb-2">
                  {entry.title}
                </h2>
                <p className="text-[14px] text-gray-600 leading-relaxed mb-5 max-w-[60ch]">
                  {entry.summary}
                </p>

                <ul className="space-y-2">
                  {entry.changes.map((change, i) => {
                    const cfg = TAG_STYLES[change.tag];
                    return (
                      <li key={i} className="flex items-start gap-3">
                        <span
                          className={`shrink-0 inline-flex items-center justify-center min-w-[64px] h-[19px] rounded-md ${cfg.bg} ring-1 px-2 text-[10px] font-bold tracking-[0.06em] uppercase ${cfg.text} mt-px`}
                        >
                          {cfg.label}
                        </span>
                        <span className="text-[13.5px] text-gray-700 leading-snug pt-px">
                          {change.text}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-16 pt-8 border-t border-gray-200">
          <p className="text-[12.5px] text-gray-500">
            Have feedback or hit a bug?{" "}
            <a href="mailto:parbhat@parbhat.work" className="font-semibold text-[#0a0a0a] underline underline-offset-2">
              parbhat@parbhat.work
            </a>
          </p>
        </div>

      </main>
    </div>
  );
}
