import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ComponentStatus = "operational" | "degraded" | "outage" | "not_configured";

type Component = {
  id: string;
  name: string;
  description: string;
  status: ComponentStatus;
  detail?: string;
  latencyMs?: number;
};

type StatusPayload = {
  status: ComponentStatus;
  generatedAt: string;
  components: Component[];
};

type MetricsPayload = {
  generatedAt: string;
  jobs: {
    totalRecorded: number;
    completed: number;
    failed: number;
    last24h: number;
    last7d: number;
  };
  successRate: number;
  renderTime: {
    sampleSize: number;
    avgMs: number;
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
  };
  stages: { name: string; sampleSize: number; avgMs: number; p95Ms: number }[];
};

const STATUS_CONFIG: Record<ComponentStatus, {
  label: string;
  dotClass: string;
  bgClass: string;
  textClass: string;
}> = {
  operational: {
    label: "Operational",
    dotClass: "bg-emerald-500",
    bgClass: "bg-emerald-50",
    textClass: "text-emerald-700",
  },
  degraded: {
    label: "Degraded",
    dotClass: "bg-amber-500",
    bgClass: "bg-amber-50",
    textClass: "text-amber-700",
  },
  outage: {
    label: "Outage",
    dotClass: "bg-rose-500",
    bgClass: "bg-rose-50",
    textClass: "text-rose-700",
  },
  not_configured: {
    label: "Not configured",
    dotClass: "bg-gray-300",
    bgClass: "bg-gray-50",
    textClass: "text-gray-500",
  },
};

const OVERALL_HEADLINE: Record<ComponentStatus, string> = {
  operational: "All systems operational",
  degraded: "Some systems degraded",
  outage: "Active outage",
  not_configured: "No services configured",
};

async function fetchStatus(): Promise<StatusPayload | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://cutline.cloud";
    const res = await fetch(`${baseUrl}/api/status`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as StatusPayload;
  } catch {
    return null;
  }
}

async function fetchMetrics(): Promise<MetricsPayload | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://cutline.cloud";
    const res = await fetch(`${baseUrl}/api/metrics`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as MetricsPayload;
  } catch {
    return null;
  }
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "—";
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return `${m}m ${s}s`;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toUTCString().replace("GMT", "UTC");
  } catch {
    return iso;
  }
}

export default async function StatusPage() {
  const [data, metrics] = await Promise.all([fetchStatus(), fetchMetrics()]);

  if (!data) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-[#0a0a0a]">Status unavailable</h1>
          <p className="mt-2 text-sm text-gray-500">
            Could not retrieve service status. Please try again in a moment.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center px-4 py-2 rounded-full bg-[#0a0a0a] hover:bg-black text-white text-[12px] font-bold tracking-[0.06em] uppercase transition-colors"
          >
            Back home
          </Link>
        </div>
      </div>
    );
  }

  const overall = STATUS_CONFIG[data.status];

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
            <span className="text-[14px] font-medium text-gray-600">Status</span>
          </Link>
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto px-5 sm:px-8 py-12 sm:py-16">

        <div className={`relative overflow-hidden rounded-2xl border border-gray-200 ${overall.bgClass} p-6 sm:p-8 mb-10`}>
          <div className="flex items-center gap-3.5">
            <span className="relative flex h-3 w-3">
              {data.status === "operational" && (
                <span className={`absolute inline-flex h-full w-full rounded-full ${overall.dotClass} opacity-50 animate-ping`} />
              )}
              <span className={`relative inline-flex h-3 w-3 rounded-full ${overall.dotClass}`} />
            </span>
            <h1 className={`text-[1.625rem] sm:text-[2rem] font-bold tracking-[-0.025em] ${overall.textClass}`}>
              {OVERALL_HEADLINE[data.status]}
            </h1>
          </div>
          <p className="mt-2 text-[13px] text-gray-500 tabular-nums">
            Last checked <span className="text-gray-700 font-medium">{formatTime(data.generatedAt)}</span>
          </p>
        </div>

        {metrics && metrics.jobs.totalRecorded > 0 ? (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[11px] font-semibold tracking-[0.18em] uppercase text-gray-500">
                Live metrics
              </h2>
              <span className="text-[11px] text-gray-400 tabular-nums">
                last {metrics.jobs.totalRecorded} jobs
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4">
                <p className="text-[10.5px] font-semibold tracking-[0.16em] uppercase text-gray-400 mb-1">
                  Last 24h
                </p>
                <p className="text-[1.75rem] font-bold text-[#0a0a0a] tabular-nums leading-none">
                  {metrics.jobs.last24h.toLocaleString()}
                </p>
                <p className="text-[11px] text-gray-500 mt-1.5">jobs submitted</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4">
                <p className="text-[10.5px] font-semibold tracking-[0.16em] uppercase text-gray-400 mb-1">
                  Last 7d
                </p>
                <p className="text-[1.75rem] font-bold text-[#0a0a0a] tabular-nums leading-none">
                  {metrics.jobs.last7d.toLocaleString()}
                </p>
                <p className="text-[11px] text-gray-500 mt-1.5">jobs submitted</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4">
                <p className="text-[10.5px] font-semibold tracking-[0.16em] uppercase text-gray-400 mb-1">
                  Success rate
                </p>
                <p className="text-[1.75rem] font-bold text-emerald-600 tabular-nums leading-none">
                  {(metrics.successRate * 100).toFixed(1)}%
                </p>
                <p className="text-[11px] text-gray-500 mt-1.5 tabular-nums">
                  {metrics.jobs.completed} of {metrics.jobs.completed + metrics.jobs.failed}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4">
                <p className="text-[10.5px] font-semibold tracking-[0.16em] uppercase text-gray-400 mb-1">
                  Avg render
                </p>
                <p className="text-[1.75rem] font-bold text-[#0a0a0a] tabular-nums leading-none">
                  {formatDuration(metrics.renderTime.avgMs)}
                </p>
                <p className="text-[11px] text-gray-500 mt-1.5 tabular-nums">
                  p95 {formatDuration(metrics.renderTime.p95Ms)}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 sm:px-6">
              <div className="flex items-baseline justify-between gap-3 mb-3">
                <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-gray-500">
                  Render time distribution
                </p>
                <p className="text-[10.5px] font-mono text-gray-400 tabular-nums">
                  n = {metrics.renderTime.sampleSize}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-[10.5px] font-semibold tracking-[0.14em] uppercase text-gray-400 mb-0.5">p50</p>
                  <p className="text-[16px] font-bold text-[#0a0a0a] tabular-nums">{formatDuration(metrics.renderTime.p50Ms)}</p>
                </div>
                <div>
                  <p className="text-[10.5px] font-semibold tracking-[0.14em] uppercase text-gray-400 mb-0.5">p95</p>
                  <p className="text-[16px] font-bold text-[#0a0a0a] tabular-nums">{formatDuration(metrics.renderTime.p95Ms)}</p>
                </div>
                <div>
                  <p className="text-[10.5px] font-semibold tracking-[0.14em] uppercase text-gray-400 mb-0.5">p99</p>
                  <p className="text-[16px] font-bold text-[#0a0a0a] tabular-nums">{formatDuration(metrics.renderTime.p99Ms)}</p>
                </div>
              </div>
            </div>

            {metrics.stages.length > 0 ? (
              <div className="mt-3 rounded-2xl border border-gray-200 bg-white overflow-hidden">
                <div className="flex items-baseline justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/60 sm:px-6">
                  <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-gray-500">
                    Per-stage timing
                  </p>
                  <p className="text-[10.5px] font-mono text-gray-400 tabular-nums">
                    avg / p95
                  </p>
                </div>
                <div className="divide-y divide-gray-100">
                  {metrics.stages.map((stage) => (
                    <div key={stage.name} className="flex items-baseline justify-between px-5 py-2.5 sm:px-6">
                      <span className="text-[12.5px] font-medium text-gray-700 capitalize">
                        {stage.name}
                      </span>
                      <span className="text-[12px] font-mono text-gray-500 tabular-nums">
                        {formatDuration(stage.avgMs)}
                        <span className="text-gray-300 mx-1.5">/</span>
                        <span className="text-gray-700">{formatDuration(stage.p95Ms)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[11px] font-semibold tracking-[0.18em] uppercase text-gray-500">
              Components
            </h2>
            <span className="text-[11px] text-gray-400 tabular-nums">
              {data.components.length} services
            </span>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden divide-y divide-gray-100">
            {data.components.map((c) => {
              const cfg = STATUS_CONFIG[c.status];
              return (
                <div key={c.id} className="flex items-start gap-4 px-5 py-4 sm:px-6">
                  <span className="flex items-center justify-center w-6 h-6 shrink-0 mt-0.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${cfg.dotClass}`} aria-hidden />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="text-[14.5px] font-semibold text-[#0a0a0a] truncate">
                        {c.name}
                      </h3>
                      <span className={`text-[11px] font-bold tracking-[0.06em] uppercase shrink-0 ${cfg.textClass}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-[12.5px] text-gray-500 mt-0.5">
                      {c.description}
                    </p>
                    {c.detail || c.latencyMs !== undefined ? (
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-gray-400">
                        {c.detail ? <span>{c.detail}</span> : null}
                        {c.latencyMs !== undefined ? (
                          <span className="tabular-nums">{c.latencyMs}ms</span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 mb-10">
          <h2 className="text-[11px] font-semibold tracking-[0.18em] uppercase text-gray-500 mb-4">
            Pipeline architecture
          </h2>
          <p className="text-[13.5px] text-gray-700 leading-relaxed mb-4">
            Cutline runs every video through a 12-stage pipeline orchestrated by BullMQ workers. Each stage checks a Redis cancellation flag before executing, and transient failures (429 / 5xx) retry up to three times with exponential backoff.
          </p>
          <ol className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-1.5 text-[12.5px] text-gray-600 font-mono">
            {[
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
            ].map((step) => (
              <li key={step} className="tabular-nums">{step}</li>
            ))}
          </ol>
        </section>

        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
          {[
            { label: "Health endpoint", path: "/api/health" },
            { label: "Liveness probe", path: "/api/health/live" },
            { label: "Readiness probe", path: "/api/health/ready" },
            { label: "Metrics", path: "/api/metrics" },
          ].map((row) => (
            <div key={row.path} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
              <p className="text-[10.5px] font-semibold tracking-[0.16em] uppercase text-gray-400 mb-1">
                {row.label}
              </p>
              <code className="text-[12px] font-mono text-[#0a0a0a]">{row.path}</code>
            </div>
          ))}
        </section>

        <p className="text-[12px] text-gray-400 text-center">
          Status is computed live on each request. Component checks include a real Redis ping, environment configuration, and database availability.
        </p>

      </main>
    </div>
  );
}
