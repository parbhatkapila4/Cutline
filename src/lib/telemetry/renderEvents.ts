import { getSql, isDatabaseConfigured } from "@/lib/db/client";

export type RenderEventType =
  | "job_started"
  | "job_completed"
  | "job_failed"
  | "stage_started"
  | "stage_completed"
  | "stage_failed"
  | "provider_error";

export type RenderEvent = {
  jobId: string;
  userId?: string | null;
  eventType: RenderEventType;
  stageName?: string | null;
  errorCode?: string | null;
  durationMs?: number | null;
  providerError?: string | null;
  occurredAt?: Date | null;
};

function toIntOrNull(v: number | null | undefined): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return Math.max(0, Math.round(v));
}

const MAX_PROVIDER_ERROR_CHARS = 4000;
const TRUNCATION_MARKER = "\n…[truncated]…\n";

const SECRET_ENV_KEYS = [
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "GOOGLE_SERVICE_ACCOUNT_JSON_B64",
  "ELEVENLABS_API_KEY",
  "HEYGEN_API_KEY",
  "OPENROUTER_API_KEY",
  "ANTHROPIC_API_KEY",
  "DODO_PAYMENTS_API_KEY",
  "REDIS_URL",
  "DATABASE_URL",
];

const SECRET_PATTERNS: [RegExp, string][] = [
  [/AIza[0-9A-Za-z_-]{10,}/g, "***REDACTED***"],
  [/\bsk-[A-Za-z0-9_-]{16,}/g, "***REDACTED***"],
  [/([?&](?:key|api_?key|access_token|token)=)[^&\s"']+/gi, "$1***REDACTED***"],
  [/(bearer\s+)[A-Za-z0-9._-]{16,}/gi, "$1***REDACTED***"],
  [/\/\/[^:/\s@]+:[^@/\s]+@/g, "//***REDACTED***@"],
  [/\bya29\.[A-Za-z0-9._-]{10,}/g, "***REDACTED***"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, "***REDACTED***"],
];
export function redactSecrets(raw: string): string {
  let out = String(raw);
  for (const name of SECRET_ENV_KEYS) {
    const value = process.env[name];
    if (typeof value === "string" && value.length >= 8) {
      out = out.split(value).join("***REDACTED***");
    }
  }
  for (const [pattern, replacement] of SECRET_PATTERNS) {
    out = out.replace(pattern, replacement);
  }
  if (out.length <= MAX_PROVIDER_ERROR_CHARS) return out;

  const half = Math.floor((MAX_PROVIDER_ERROR_CHARS - TRUNCATION_MARKER.length) / 2);
  return out.slice(0, half) + TRUNCATION_MARKER + out.slice(out.length - half);
}

function isUndefinedColumn(e: unknown): boolean {
  if (e && typeof e === "object" && (e as { code?: unknown }).code === "42703") return true;
  const msg = e instanceof Error ? e.message : String(e);
  return /column .* does not exist/i.test(msg);
}

export function recordRenderEvent(event: RenderEvent): void {
  if (!event?.jobId || !event.eventType) return;
  if (!isDatabaseConfigured()) return;

  const occurredAt = (event.occurredAt ?? new Date()).toISOString();
  const providerError = event.providerError ? redactSecrets(event.providerError) : null;
  const jobId = String(event.jobId);
  const userId = event.userId ?? null;
  const stageName = event.stageName ?? null;
  const errorCode = event.errorCode ?? null;
  const durationMs = toIntOrNull(event.durationMs);

  void (async () => {
    try {
      const sql = getSql();
      try {
        await sql`
          INSERT INTO render_events
            (job_id, user_id, event_type, stage_name, error_code, duration_ms, provider_error, occurred_at)
          VALUES (
            ${jobId},
            ${userId},
            ${event.eventType},
            ${stageName},
            ${errorCode},
            ${durationMs},
            ${providerError},
            ${occurredAt}
          )
        `;
        return;
      } catch (e) {
        if (!isUndefinedColumn(e)) throw e;
      }

      await sql`
        INSERT INTO render_events
          (job_id, user_id, event_type, stage_name, error_code, duration_ms, provider_error)
        VALUES (
          ${jobId},
          ${userId},
          ${event.eventType},
          ${stageName},
          ${errorCode},
          ${durationMs},
          ${providerError}
        )
      `;
    } catch (e) {
      console.warn(
        "[render-events] insert failed (ignored):",
        e instanceof Error ? e.message : String(e)
      );
    }
  })();
}
