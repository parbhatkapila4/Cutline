import type { JobTelemetry } from "./types";
import type { Job } from "bullmq";
import {
  getTelemetryFilePath,
  loadTelemetryFromFile,
  saveTelemetryToFile,
} from "./persistence";
const activeJobs = new Map<string, Job>();

export function setActiveJob(jobId: string, job: Job): void {
  if (!jobId || !job) return;
  activeJobs.set(jobId, job);
}

export function clearActiveJob(jobId: string): void {
  if (!jobId) return;
  activeJobs.delete(jobId);
}

function pushProgress(
  jobId: string,
  payload: { stage: string; detail?: string; startedAt: string }
): void {
  const job = activeJobs.get(jobId);
  if (!job) return;
  void Promise.resolve(job.updateProgress(payload)).catch(() => { });
}

const MAX_JOBS = 500;
const ERROR_MAX_LENGTH = 500;

const store = new Map<string, JobTelemetry>();
const order: string[] = [];
let loadedFromFile = false;
let saving = false;

function ensureLoaded(): void {
  if (loadedFromFile) return;
  loadedFromFile = true;
  if (!getTelemetryFilePath()) return;
  try {
    const jobs = loadTelemetryFromFile();
    if (jobs.length === 0) return;
    for (const job of jobs) {
      store.set(job.jobId, job);
    }
    const ids = jobs.map((j) => j.jobId);
    order.length = 0;
    order.push(...ids.reverse());
    evictOldest();
  } catch (e) {
    safeLog("ensureLoaded failed", e);
  }
}

function flushToFile(): void {
  if (!getTelemetryFilePath()) return;
  if (saving) return;
  saving = true;
  try {
    const jobs = listRecentJobs(MAX_JOBS);
    saveTelemetryToFile(jobs);
  } catch {
  } finally {
    saving = false;
  }
}

function truncateError(msg: string): string {
  if (msg.length <= ERROR_MAX_LENGTH) return msg;
  return msg.slice(0, ERROR_MAX_LENGTH) + "…";
}

function evictOldest(): void {
  while (order.length >= MAX_JOBS && order.length > 0) {
    const oldest = order.shift();
    if (oldest) store.delete(oldest);
  }
}

function safeLog(message: string, err?: unknown): void {
  try {
    console.warn("[telemetry] " + message + (err ? " " + String(err) : ""));
  } catch {
  }
}

export function recordJobStart(
  jobId: string,
  meta?: { platform?: string; variationCount?: number; requestId?: string }
): void {
  if (!jobId) return;
  try {
    ensureLoaded();
    evictOldest();
    const now = new Date().toISOString();
    store.set(jobId, {
      jobId,
      status: "running",
      startedAt: now,
      stages: [],
      ...(meta?.platform ? { platform: meta.platform } : {}),
      ...(meta?.variationCount != null ? { variationCount: meta.variationCount } : {}),
      ...(meta?.requestId ? { requestId: meta.requestId } : {}),
    });
    const idx = order.indexOf(jobId);
    if (idx >= 0) order.splice(idx, 1);
    order.push(jobId);
  } catch (e) {
    safeLog("recordJobStart failed", e);
  }
}

export function recordStageStart(jobId: string, stageName: string): void {
  if (!jobId || !stageName) return;
  try {
    ensureLoaded();
    const job = store.get(jobId);
    const now = new Date().toISOString();
    if (job) {
      const existing = job.stages.find((s) => s.name === stageName && !s.completedAt);
      if (!existing) {
        job.stages.push({ name: stageName, startedAt: now });
      }
    } else {
      store.set(jobId, {
        jobId,
        status: "running",
        startedAt: now,
        stages: [{ name: stageName, startedAt: now }],
      });
      evictOldest();
      const idx = order.indexOf(jobId);
      if (idx >= 0) order.splice(idx, 1);
      order.push(jobId);
    }
    pushProgress(jobId, { stage: stageName, startedAt: now });
  } catch (e) {
    safeLog("recordStageStart failed", e);
  }
}

export function recordStageProgress(
  jobId: string,
  stageName: string,
  detail: string
): void {
  if (!jobId || !stageName) return;
  try {
    ensureLoaded();
    const job = store.get(jobId);
    let startedAt = new Date().toISOString();
    if (job) {
      const stage = job.stages.find((s) => s.name === stageName && !s.completedAt);
      if (stage) {
        stage.progress = detail;
        startedAt = stage.startedAt;
      }
    }
    pushProgress(jobId, { stage: stageName, detail, startedAt });
  } catch (e) {
    safeLog("recordStageProgress failed", e);
  }
}

export function recordStageEnd(
  jobId: string,
  stageName: string,
  error?: string
): void {
  if (!jobId || !stageName) return;
  try {
    ensureLoaded();
    const job = store.get(jobId);
    const now = new Date().toISOString();
    if (job) {
      const stage = job.stages.find((s) => s.name === stageName && !s.completedAt);
      if (stage) {
        stage.completedAt = now;
        stage.durationMs =
          stage.startedAt && stage.completedAt
            ? new Date(stage.completedAt).getTime() - new Date(stage.startedAt).getTime()
            : undefined;
        if (error) stage.error = truncateError(error);
      } else {
        job.stages.push({
          name: stageName,
          startedAt: now,
          completedAt: now,
          durationMs: 0,
          ...(error ? { error: truncateError(error) } : {}),
        });
      }
    } else {
      store.set(jobId, {
        jobId,
        status: "running",
        startedAt: now,
        stages: [
          {
            name: stageName,
            startedAt: now,
            completedAt: now,
            durationMs: 0,
            ...(error ? { error: truncateError(error) } : {}),
          },
        ],
      });
      evictOldest();
      const idx = order.indexOf(jobId);
      if (idx >= 0) order.splice(idx, 1);
      order.push(jobId);
    }
  } catch (e) {
    safeLog("recordStageEnd failed", e);
  }
}

export function recordJobEnd(
  jobId: string,
  status: "completed" | "failed",
  error?: string
): void {
  if (!jobId) return;
  try {
    ensureLoaded();
    const job = store.get(jobId);
    const now = new Date().toISOString();
    if (job) {
      job.status = status;
      job.completedAt = now;
      job.durationMs =
        job.startedAt && job.completedAt
          ? new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()
          : undefined;
      if (error) job.error = truncateError(error);
    } else {
      store.set(jobId, {
        jobId,
        status,
        startedAt: now,
        completedAt: now,
        durationMs: 0,
        stages: [],
        ...(error ? { error: truncateError(error) } : {}),
      });
      evictOldest();
      const idx = order.indexOf(jobId);
      if (idx >= 0) order.splice(idx, 1);
      order.push(jobId);
    }
    flushToFile();
  } catch (e) {
    safeLog("recordJobEnd failed", e);
  }
}

export function getJobTelemetry(jobId: string): JobTelemetry | undefined {
  try {
    ensureLoaded();
    return store.get(jobId);
  } catch (e) {
    safeLog("getJobTelemetry failed", e);
    return undefined;
  }
}

export function listRecentJobs(limit = 50): JobTelemetry[] {
  try {
    ensureLoaded();
    const reversed = [...order].reverse();
    const limited = reversed.slice(0, Math.max(1, Math.min(limit, 500)));
    return limited
      .map((id) => store.get(id))
      .filter((j): j is JobTelemetry => j != null);
  } catch (e) {
    safeLog("listRecentJobs failed", e);
    return [];
  }
}

export function getAggregateStats(): {
  totalJobs: number;
  completed: number;
  failed: number;
  avgDurationMs: number;
} {
  try {
    ensureLoaded();
    const jobs = [...store.values()];
    const completed = jobs.filter((j) => j.status === "completed").length;
    const failed = jobs.filter((j) => j.status === "failed").length;
    const withDuration = jobs.filter(
      (j) => j.status === "completed" && j.durationMs != null && j.durationMs > 0
    );
    const avgDurationMs =
      withDuration.length > 0
        ? withDuration.reduce((s, j) => s + (j.durationMs ?? 0), 0) / withDuration.length
        : 0;
    return {
      totalJobs: jobs.length,
      completed,
      failed,
      avgDurationMs: Math.round(avgDurationMs),
    };
  } catch (e) {
    safeLog("getAggregateStats failed", e);
    return { totalJobs: 0, completed: 0, failed: 0, avgDurationMs: 0 };
  }
}
