import Link from "next/link";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "auth", label: "Authentication" },
  { id: "create-job", label: "Create a video" },
  { id: "poll-status", label: "Poll job status" },
  { id: "download", label: "Download the MP4" },
  { id: "cancel", label: "Cancel a job" },
  { id: "list-jobs", label: "List recent jobs" },
  { id: "webhooks", label: "Webhooks" },
  { id: "idempotency", label: "Idempotency" },
  { id: "errors", label: "Error codes" },
  { id: "rate-limits", label: "Rate limits" },
];

const CONTACT_EMAIL = "parbhat@parbhat.work";

function CodeBlock({ language, children }: { language: string; children: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0a0a0a] overflow-hidden my-3">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
        <span className="text-[10.5px] font-semibold tracking-[0.16em] uppercase text-zinc-500">
          {language}
        </span>
      </div>
      <pre className="overflow-x-auto px-4 py-4 text-[12.5px] font-mono leading-relaxed text-zinc-200">
        <code>{children}</code>
      </pre>
    </div>
  );
}

function Endpoint({
  method,
  path,
}: {
  method: "GET" | "POST";
  path: string;
}) {
  const methodColor =
    method === "POST" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" : "text-sky-400 bg-sky-500/10 border-sky-500/30";
  return (
    <div className="inline-flex items-stretch rounded-md overflow-hidden border border-white/10 bg-white/[0.02] mt-1 mb-3">
      <span className={`inline-flex items-center px-2.5 py-1 text-[10.5px] font-bold tracking-[0.08em] border-r ${methodColor}`}>
        {method}
      </span>
      <code className="px-3 py-1 text-[12.5px] font-mono text-zinc-200">{path}</code>
    </div>
  );
}

function ParamTable({ rows }: { rows: { name: string; type: string; required?: boolean; desc: string }[] }) {
  return (
    <div className="rounded-xl border border-white/10 overflow-hidden mt-3 mb-4">
      <table className="w-full text-[12.5px]">
        <thead className="bg-white/[0.02] border-b border-white/10">
          <tr>
            <th className="text-left px-4 py-2.5 font-semibold text-zinc-400 tracking-tight">Parameter</th>
            <th className="text-left px-4 py-2.5 font-semibold text-zinc-400 tracking-tight w-24">Type</th>
            <th className="text-left px-4 py-2.5 font-semibold text-zinc-400 tracking-tight">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.05]">
          {rows.map((row) => (
            <tr key={row.name}>
              <td className="px-4 py-2.5 font-mono text-zinc-200 whitespace-nowrap align-top">
                {row.name}
                {row.required ? <span className="text-rose-400 ml-1">*</span> : null}
              </td>
              <td className="px-4 py-2.5 font-mono text-zinc-500 align-top">{row.type}</td>
              <td className="px-4 py-2.5 text-zinc-400 leading-relaxed align-top">{row.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center bg-black/60 backdrop-blur-sm border-b border-white/5">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-white border border-white/20 hover:bg-white/5 px-3 py-2 rounded-lg transition-colors"
        >
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-white/10">
            <svg viewBox="0 0 24 24" className="w-3 h-3 text-white" fill="currentColor">
              <path d="M8 5.14v13.72a1 1 0 0 0 1.5.866l11.5-6.86a1 1 0 0 0 0-1.732l-11.5-6.86A1 1 0 0 0 8 5.14z" />
            </svg>
          </span>
          <span>Cutline</span>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-400">Docs</span>
        </Link>
        <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.04] text-[10.5px] font-mono text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          v1
        </div>
      </div>

      <main className="pt-24 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[min(90vw,1760px)] mx-auto grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-10 lg:gap-14">

          <aside className="lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto" aria-label="Page sections">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <h2 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.16em] mb-3.5">On this page</h2>
              <ul className="space-y-1.5 text-[13.5px]">
                {SECTIONS.map(({ id, label }) => (
                  <li key={id}>
                    <a href={`#${id}`} className="block text-zinc-400 hover:text-white transition-colors leading-snug">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <div className="min-w-0">

            <section className="mb-12">
              <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-[0.18em] mb-3">API Reference</p>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4">
                Cutline REST API
              </h1>
              <p className="text-[15px] text-zinc-400 leading-relaxed max-w-[64ch]">
                Programmatic access to the same 12-stage pipeline that powers the web app. Submit a sentence, poll the job, download the MP4. JSON in, MP4 out.
              </p>
            </section>

            <section id="overview" className="mb-16">
              <h2 className="text-2xl font-semibold text-white mb-4">Overview</h2>
              <div className="space-y-3 text-[14px] text-zinc-400 leading-relaxed">
                <p>
                  The Cutline API exposes a single asynchronous workflow: <span className="text-zinc-200">submit a job</span>, <span className="text-zinc-200">poll for status</span>, <span className="text-zinc-200">download when ready</span>. All endpoints are versioned under <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-200 font-mono text-[12.5px]">/api/v1/</code>.
                </p>
                <p>
                  Responses are JSON. Error responses always carry a stable, branchable <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-200 font-mono text-[12.5px]">code</code> field - never branch on <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-200 font-mono text-[12.5px]">error</code> message text.
                </p>
              </div>

              <div className="mt-5 grid sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <p className="text-[10.5px] font-semibold tracking-[0.16em] uppercase text-zinc-500 mb-1.5">Base URL</p>
                  <code className="text-[13px] font-mono text-white">https://cutline.cloud/api/v1</code>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <p className="text-[10.5px] font-semibold tracking-[0.16em] uppercase text-zinc-500 mb-1.5">Content type</p>
                  <code className="text-[13px] font-mono text-white">application/json</code>
                </div>
              </div>
            </section>

            <section id="auth" className="mb-16">
              <h2 className="text-2xl font-semibold text-white mb-4">Authentication</h2>
              <p className="text-[14px] text-zinc-400 leading-relaxed mb-3">
                API requests are authenticated with an API key sent in the <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-200 font-mono text-[12.5px]">X-API-Key</code> header. Generate keys from your dashboard. Each key is shown <em>once</em> at creation time and stored as a hash on our side - keep it safe.
              </p>
              <CodeBlock language="curl">{`curl https://cutline.cloud/api/v1/generate/jobs \\
  -H "X-API-Key: ck_live_••••••••••••••••"`}</CodeBlock>
            </section>

            <section id="create-job" className="mb-16">
              <h2 className="text-2xl font-semibold text-white mb-4">Create a video</h2>
              <Endpoint method="POST" path="/api/v1/generate" />

              <p className="text-[14px] text-zinc-400 leading-relaxed mb-3">
                Submits a generation job. Returns immediately with a <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-200 font-mono text-[12.5px]">jobId</code> - rendering happens asynchronously in a worker. Poll status (next section) until <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-200 font-mono text-[12.5px]">completed</code> or <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-200 font-mono text-[12.5px]">failed</code>.
              </p>

              <h3 className="text-[15px] font-semibold text-zinc-200 mt-6 mb-2">Request body</h3>
              <ParamTable
                rows={[
                  { name: "input", type: "string", required: true, desc: "Your one-sentence prompt. 5-500 characters." },
                  { name: "durationSeconds", type: "number", desc: "Target video length, 10-60. Defaults to inferred from prompt." },
                  { name: "mode", type: "string", desc: "\"slideshow\" (default) or \"talking_object\" (Veo-backed character video)." },
                  { name: "captions", type: "string", desc: "\"on\" (default) or \"off\". Burned-in subtitles." },
                  { name: "platform", type: "string", desc: "\"general\" / \"linkedin\" / \"twitter\" / \"youtube_shorts\". Tunes pacing and tone." },
                  { name: "assetIds", type: "string[]", desc: "IDs from /api/assets/upload - logos, product photos, reference media." },
                  { name: "brandColors", type: "object", desc: "{ primary?: hex, secondary?: hex }. Used by the visual stage." },
                  { name: "callbackUrl", type: "string", desc: "Webhook URL fired on terminal job state. See Webhooks below." },
                  { name: "textModel", type: "string", desc: "OpenRouter model ID override for this job's LLM stages." },
                ]}
              />

              <h3 className="text-[15px] font-semibold text-zinc-200 mt-6 mb-2">Example</h3>
              <CodeBlock language="curl">{`curl -X POST https://cutline.cloud/api/v1/generate \\
  -H "X-API-Key: ck_live_••••••••••••••••" \\
  -H "Content-Type: application/json" \\
  -H "X-Idempotency-Key: order_12345" \\
  -d '{
    "input": "Explain how Redis works in 30 seconds",
    "durationSeconds": 30,
    "captions": "on",
    "platform": "youtube_shorts"
  }'`}</CodeBlock>

              <CodeBlock language="javascript">{`const res = await fetch("https://cutline.cloud/api/v1/generate", {
  method: "POST",
  headers: {
    "X-API-Key": process.env.CUTLINE_API_KEY,
    "Content-Type": "application/json",
    "X-Idempotency-Key": crypto.randomUUID(),
  },
  body: JSON.stringify({
    input: "Explain how Redis works in 30 seconds",
    durationSeconds: 30,
    captions: "on",
    platform: "youtube_shorts",
  }),
});
const { jobId } = await res.json();`}</CodeBlock>

              <CodeBlock language="python">{`import os, requests, uuid

res = requests.post(
    "https://cutline.cloud/api/v1/generate",
    headers={
        "X-API-Key": os.environ["CUTLINE_API_KEY"],
        "X-Idempotency-Key": str(uuid.uuid4()),
    },
    json={
        "input": "Explain how Redis works in 30 seconds",
        "durationSeconds": 30,
        "captions": "on",
        "platform": "youtube_shorts",
    },
)
job_id = res.json()["jobId"]`}</CodeBlock>

              <h3 className="text-[15px] font-semibold text-zinc-200 mt-6 mb-2">Response (200)</h3>
              <CodeBlock language="json">{`{
  "jobId": "job_01HK8Z9X2YBN5T7QM3R4S5T6"
}`}</CodeBlock>
            </section>

            <section id="poll-status" className="mb-16">
              <h2 className="text-2xl font-semibold text-white mb-4">Poll job status</h2>
              <Endpoint method="GET" path="/api/v1/generate/:jobId" />

              <p className="text-[14px] text-zinc-400 leading-relaxed">
                Returns current job state. Poll with exponential backoff (we use <span className="font-mono text-zinc-200">2s → 4s → 8s → 15s cap</span> in the web app). Stop polling on terminal states <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-200 font-mono text-[12.5px]">completed</code>, <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-200 font-mono text-[12.5px]">failed</code>, or <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-200 font-mono text-[12.5px]">cancelled</code>.
              </p>

              <CodeBlock language="json">{`{
  "status": "processing",
  "stage": "tts",
  "stageProgress": 0.42,
  "videoUrl": null,
  "error": null
}`}</CodeBlock>
              <CodeBlock language="json">{`{
  "status": "completed",
  "videoUrl": "/temp/job_01HK8Z9X2YBN5T7QM3R4S5T6.mp4",
  "error": null,
  "completedAt": "2026-05-10T14:23:11.842Z"
}`}</CodeBlock>
            </section>

            <section id="download" className="mb-16">
              <h2 className="text-2xl font-semibold text-white mb-4">Download the MP4</h2>
              <Endpoint method="GET" path="/api/v1/generate/:jobId/download" />

              <p className="text-[14px] text-zinc-400 leading-relaxed">
                Streams the rendered MP4 as <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-200 font-mono text-[12.5px]">Content-Disposition: attachment</code>. Files are retained for <span className="font-mono text-zinc-200">VIDEO_RETENTION_HOURS</span> (default 24h) - fetch within the window. Returns <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-200 font-mono text-[12.5px]">404 VIDEO_NOT_FOUND</code> after expiry.
              </p>

              <CodeBlock language="curl">{`curl -L \\
  -H "X-API-Key: ck_live_••••••••••••••••" \\
  -o video.mp4 \\
  https://cutline.cloud/api/v1/generate/$JOB_ID/download`}</CodeBlock>
            </section>

            <section id="cancel" className="mb-16">
              <h2 className="text-2xl font-semibold text-white mb-4">Cancel a job</h2>
              <Endpoint method="POST" path="/api/v1/generate/:jobId/cancel" />

              <p className="text-[14px] text-zinc-400 leading-relaxed">
                Sets a Redis cancellation flag. The orchestrator checks the flag between every pipeline stage, so cancellation is eventual - the current stage finishes before the job exits. Returns <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-200 font-mono text-[12.5px]">409 JOB_CANNOT_CANCEL</code> if the job is already in a terminal state.
              </p>
            </section>

            <section id="list-jobs" className="mb-16">
              <h2 className="text-2xl font-semibold text-white mb-4">List recent jobs</h2>
              <Endpoint method="GET" path="/api/v1/generate/jobs" />

              <p className="text-[14px] text-zinc-400 leading-relaxed">
                Returns up to 50 most recent jobs for the authenticated key, ordered by creation time descending. Pass <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-200 font-mono text-[12.5px]">?limit=20</code> to truncate.
              </p>
            </section>

            <section id="webhooks" className="mb-16">
              <h2 className="text-2xl font-semibold text-white mb-4">Webhooks</h2>
              <p className="text-[14px] text-zinc-400 leading-relaxed mb-3">
                Pass <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-200 font-mono text-[12.5px]">callbackUrl</code> when creating a job. When the job reaches a terminal state we POST the following payload:
              </p>
              <CodeBlock language="json">{`{
  "jobId": "job_01HK8Z9X2YBN5T7QM3R4S5T6",
  "status": "completed",
  "videoUrl": "/temp/job_01HK8Z9X2YBN5T7QM3R4S5T6.mp4",
  "completedAt": "2026-05-10T14:23:11.842Z",
  "qualityReport": {
    "scriptStage": "ok",
    "ttsStage": "ok",
    "imageStage": "fallback_used",
    "renderStage": "ok",
    "retries": 1
  }
}`}</CodeBlock>
              <p className="text-[14px] text-zinc-400 leading-relaxed mt-3">
                Delivery is fire-and-forget. We do not retry. 5-second timeout. Localhost URLs are rejected in production unless <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-200 font-mono text-[12.5px]">ALLOW_LOCALHOST_WEBHOOK=true</code>.
              </p>
            </section>

            <section id="idempotency" className="mb-16">
              <h2 className="text-2xl font-semibold text-white mb-4">Idempotency</h2>
              <p className="text-[14px] text-zinc-400 leading-relaxed">
                Pass <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-200 font-mono text-[12.5px]">X-Idempotency-Key</code> (max 128 chars) on POST to safely retry network failures. The same key within a 24h window returns the same <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-200 font-mono text-[12.5px]">jobId</code> - duplicate work is never enqueued. We recommend a UUID per logical user-action.
              </p>
            </section>

            <section id="errors" className="mb-16">
              <h2 className="text-2xl font-semibold text-white mb-4">Error codes</h2>
              <p className="text-[14px] text-zinc-400 leading-relaxed mb-3">
                Branch on <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-200 font-mono text-[12.5px]">code</code>, never on <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-200 font-mono text-[12.5px]">error</code>. The <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-200 font-mono text-[12.5px]">error</code> field is human copy and may be rewritten without a version bump.
              </p>
              <ParamTable
                rows={[
                  { name: "VALIDATION_FAILED", type: "400", desc: "Input validation failed. details.errors lists field-level issues." },
                  { name: "INVALID_JSON", type: "400", desc: "Request body isn't valid JSON." },
                  { name: "BAD_REQUEST", type: "400", desc: "Generic bad request." },
                  { name: "AUTH_REQUIRED", type: "401", desc: "Missing or invalid API key." },
                  { name: "ANON_LIMIT_REACHED", type: "403", desc: "Anonymous-tier quota exhausted." },
                  { name: "JOB_NOT_FOUND", type: "404", desc: "No job with that ID." },
                  { name: "VIDEO_NOT_FOUND", type: "404", desc: "Video has been cleaned up after retention window." },
                  { name: "JOB_NOT_READY", type: "404", desc: "Tried to download before job completed." },
                  { name: "JOB_CANNOT_CANCEL", type: "409", desc: "Job is already in a terminal state." },
                  { name: "RATE_LIMITED", type: "429", desc: "Too many requests. Check Retry-After header." },
                  { name: "INTERNAL_ERROR", type: "500", desc: "Unhandled error. Safe to retry with the same idempotency key." },
                ]}
              />
            </section>

            <section id="rate-limits" className="mb-16">
              <h2 className="text-2xl font-semibold text-white mb-4">Rate limits</h2>
              <p className="text-[14px] text-zinc-400 leading-relaxed mb-3">
                Per-IP and per-key limits, enforced by Redis with sliding windows.
              </p>
              <ul className="text-[14px] text-zinc-400 leading-relaxed space-y-1.5 list-disc pl-5">
                <li><span className="text-zinc-200 font-mono">5/hour</span> - POST <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-200 font-mono text-[12.5px]">/api/v1/generate</code> per IP (anonymous)</li>
                <li><span className="text-zinc-200 font-mono">60/min</span> - GET <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-200 font-mono text-[12.5px]">/api/v1/generate/:jobId</code> per IP</li>
                <li><span className="text-zinc-200 font-mono">20/hour</span> - POST <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-200 font-mono text-[12.5px]">/api/assets/upload</code> per IP</li>
                <li>Authenticated quotas are determined by your plan - see <Link href="/pricing" className="underline text-zinc-200">pricing</Link>.</li>
              </ul>
              <p className="text-[14px] text-zinc-400 leading-relaxed mt-4">
                <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-200 font-mono text-[12.5px]">429</code> responses include a <code className="bg-white/10 px-1.5 py-0.5 rounded text-zinc-200 font-mono text-[12.5px]">Retry-After</code> header (seconds).
              </p>
            </section>

            <div className="mt-16 pt-8 border-t border-white/10">
              <p className="text-[13px] text-zinc-400">
                Need a higher rate limit, an enterprise SLA, or custom integration support?{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-white underline">
                  {CONTACT_EMAIL}
                </a>
              </p>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
