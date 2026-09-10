import { getSql, isDatabaseConfigured } from "@/lib/db/client";

export type RenderEventType =
  | "job_started"
  | "job_completed"
  | "job_failed"
  | "stage_started"
  | "stage_completed"
  | "stage_failed";

export type RenderEvent = {
  jobId: string;
  userId?: string | null;
  eventType: RenderEventType;
  stageName?: string | null;
  errorCode?: string | null;
  durationMs?: number | null;
};

function toIntOrNull(v: number | null | undefined): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return Math.max(0, Math.round(v));
}

export function recordRenderEvent(event: RenderEvent): void {
  if (!event?.jobId || !event.eventType) return;
  if (!isDatabaseConfigured()) return;

  void (async () => {
    try {
      const sql = getSql();
      await sql`
        INSERT INTO render_events
          (job_id, user_id, event_type, stage_name, error_code, duration_ms)
        VALUES (
          ${String(event.jobId)},
          ${event.userId ?? null},
          ${event.eventType},
          ${event.stageName ?? null},
          ${event.errorCode ?? null},
          ${toIntOrNull(event.durationMs)}
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
