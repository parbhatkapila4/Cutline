"use client";

import { useEffect, useEffectEvent, useState } from "react";
import {
  PIPELINE_STAGE_STEP,
  POLL_BACKOFF_FACTOR,
  POLL_INITIAL_DELAY_MS,
  POLL_MAX_DELAY_MS,
  POLL_REQUEST_TIMEOUT_MS,
} from "@/components/generate/constants";
import { runningPollDelay } from "@/components/generate/pollSchedule";

export type RenderPhase = "queued" | "running" | "done" | "stalled";

export type RenderStatus = {
  jobId: string;
  phase: RenderPhase;
  step: number;
  queuePosition: number | null;
  workerOnline: boolean | null;
};

type StatusBody = {
  status?: string;
  stage?: string;
  queuePosition?: number | null;
  workerOnline?: boolean;
  details?: { retryAfter?: number };
};
export function useRenderStatus(jobId: string | null, onSettled: (jobId: string) => void): RenderStatus | null {
  const [status, setStatus] = useState<RenderStatus | null>(null);
  const settle = useEffectEvent(onSettled);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let failures = 0;
    let step = 0;
    const startedAt = Date.now();

    const schedule = (delayMs: number) => {
      timer = setTimeout(() => void poll(), delayMs);
    };

    const poll = async () => {
      const controller = new AbortController();
      const abort = setTimeout(() => controller.abort(), POLL_REQUEST_TIMEOUT_MS);
      let wait: number | null = null;
      try {
        const res = await fetch(`/api/generate/${encodeURIComponent(jobId)}`, { signal: controller.signal });
        const body = (await res.json().catch(() => ({}))) as StatusBody;
        if (cancelled) return;
        if (!res.ok) {
          if (res.status === 429 || res.status >= 500) {
            failures += 1;
            const retryAfterMs = Number(body.details?.retryAfter) * 1000;
            wait = Math.max(
              Math.min(POLL_INITIAL_DELAY_MS * POLL_BACKOFF_FACTOR ** (failures - 1), POLL_MAX_DELAY_MS),
              Number.isFinite(retryAfterMs) ? retryAfterMs : 0
            );
          } else {
            setStatus({ jobId, phase: "stalled", step, queuePosition: null, workerOnline: null });
            return;
          }
        } else {
          failures = 0;
          const s = body.status;
          if (s === "completed" || s === "failed" || s === "cancelled") {
            setStatus({ jobId, phase: "done", step, queuePosition: null, workerOnline: null });
            settle(jobId);
            return;
          }
          const reported = typeof body.stage === "string" ? PIPELINE_STAGE_STEP[body.stage.trim()] : undefined;
          if (typeof reported === "number") step = Math.max(step, reported);
          setStatus({
            jobId,
            phase: s === "processing" ? "running" : "queued",
            step,
            queuePosition: typeof body.queuePosition === "number" ? body.queuePosition : null,
            workerOnline: typeof body.workerOnline === "boolean" ? body.workerOnline : null,
          });
        }
      } catch {
        if (cancelled) return;
        failures += 1;
        wait = Math.min(POLL_INITIAL_DELAY_MS * POLL_BACKOFF_FACTOR ** (failures - 1), POLL_MAX_DELAY_MS);
      } finally {
        clearTimeout(abort);
      }
      if (cancelled) return;
      const next = runningPollDelay(Date.now() - startedAt);
      if (next === null) {
        setStatus((prev) => (prev ? { ...prev, phase: "stalled" } : prev));
        return;
      }
      schedule(Math.max(next, wait ?? 0));
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [jobId]);

  return status?.jobId === jobId ? status : null;
}
