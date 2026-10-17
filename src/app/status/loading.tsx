import { Skeleton, SkeletonInline } from "@/components/ui/skeleton";

const COMPONENTS = [
  { name: "Queue (Redis)", description: "BullMQ job queue + rate limiting", detail: ["PONG", "1125ms"] },
  { name: "Database (Postgres)", description: "User accounts, anonymous sessions, job ownership", detail: ["DATABASE_URL configured"] },
  { name: "Language models (OpenRouter)", description: "Script, narrative, intent, and image-prompt generation", detail: ["API key configured"] },
  { name: "Text-to-speech (ElevenLabs)", description: "Voiceover generation for every shot", detail: ["ElevenLabs key configured"] },
  { name: "Image sourcing", description: "Stock photos and AI image generation per shot", detail: ["Active providers: Unsplash, Pexels, DALL·E 3"] },
];

const PIPELINE_STEPS = [
  "1  Intent",
  "2  Narrative",
  "3  Shots",
  "4  Script",
  "5  Subtitles (draft)",
  "6  TTS (voice)",
  "7  Subtitle refine",
  "8  Motion",
  "9  Asset analysis",
  "10  Visuals",
  "11  Image sourcing",
  "12  Remotion render",
];

const ENDPOINTS = [
  { label: "Health endpoint", path: "/api/health" },
  { label: "Liveness probe", path: "/api/health/live" },
  { label: "Readiness probe", path: "/api/health/ready" },
  { label: "Metrics", path: "/api/metrics" },
];

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]" aria-hidden>
      <header className="bg-white border-b border-gray-200/70">
        <div className="max-w-[1100px] mx-auto flex items-center px-5 sm:px-8 h-[60px]">
          <span className="flex items-center gap-2">
            <Skeleton tone="light" className="w-7 h-7 rounded-[7px]" />
            <SkeletonInline tone="light" className="text-[15.5px] font-semibold tracking-[-0.02em]">Cutline</SkeletonInline>
            <span className="text-gray-300 mx-1">/</span>
            <SkeletonInline tone="light" className="text-[14px] font-medium">Status</SkeletonInline>
          </span>
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto px-5 sm:px-8 py-12 sm:py-16">
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 mb-10">
          <div className="flex items-center gap-3.5">
            <Skeleton tone="light" className="h-3 w-3 shrink-0 rounded-full" />
            <h1 className="text-[1.625rem] sm:text-[2rem] font-bold tracking-[-0.025em]">
              <SkeletonInline tone="light">All systems operational</SkeletonInline>
            </h1>
          </div>
          <p className="mt-2 text-[13px] tabular-nums">
            <SkeletonInline tone="light">Last checked Sat, 17 Oct 2026 08:43:08 UTC</SkeletonInline>
          </p>
        </div>

        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[11px] font-semibold tracking-[0.18em] uppercase">
              <SkeletonInline tone="light">Components</SkeletonInline>
            </h2>
            <SkeletonInline tone="light" className="text-[11px] tabular-nums">5 services</SkeletonInline>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden divide-y divide-gray-100">
            {COMPONENTS.map((c) => (
              <div key={c.name} className="flex items-start gap-4 px-5 py-4 sm:px-6">
                <span className="flex items-center justify-center w-6 h-6 shrink-0 mt-0.5">
                  <Skeleton tone="light" className="w-2.5 h-2.5 rounded-full" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-[14.5px] font-semibold truncate">
                      <SkeletonInline tone="light">{c.name}</SkeletonInline>
                    </h3>
                    <SkeletonInline tone="light" className="text-[11px] font-bold tracking-[0.06em] uppercase shrink-0">
                      Operational
                    </SkeletonInline>
                  </div>
                  <p className="text-[12.5px] mt-0.5">
                    <SkeletonInline tone="light">{c.description}</SkeletonInline>
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono">
                    {c.detail.map((d) => (
                      <SkeletonInline key={d} tone="light">{d}</SkeletonInline>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 mb-10">
          <h2 className="text-[11px] font-semibold tracking-[0.18em] uppercase mb-4">
            <SkeletonInline tone="light">Pipeline architecture</SkeletonInline>
          </h2>
          <p className="text-[13.5px] leading-relaxed mb-4">
            <SkeletonInline tone="light">
              Cutline runs every video through a 12-stage pipeline orchestrated by BullMQ workers. Each stage checks a Redis cancellation flag before executing, and transient failures (429 / 5xx) retry up to three times with exponential backoff.
            </SkeletonInline>
          </p>
          <ol className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-1.5 text-[12.5px] font-mono">
            {PIPELINE_STEPS.map((step) => (
              <li key={step} className="tabular-nums">
                <SkeletonInline tone="light">{step}</SkeletonInline>
              </li>
            ))}
          </ol>
        </section>

        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
          {ENDPOINTS.map((row) => (
            <div key={row.path} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
              <p className="text-[10.5px] font-semibold tracking-[0.16em] uppercase mb-1">
                <SkeletonInline tone="light">{row.label}</SkeletonInline>
              </p>
              <SkeletonInline tone="light" className="text-[12px] font-mono">{row.path}</SkeletonInline>
            </div>
          ))}
        </section>

        <p className="text-[12px] text-center">
          <SkeletonInline tone="light">
            Status is computed live on each request. Component checks include a real Redis ping, environment configuration, and database availability.
          </SkeletonInline>
        </p>
      </main>
    </div>
  );
}
