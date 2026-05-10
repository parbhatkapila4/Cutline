import { NextResponse } from "next/server";
import { listRecentJobs } from "@/lib/telemetry/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export async function GET() {
  const jobs = listRecentJobs(500);

  const now = Date.now();
  const completed = jobs.filter((j) => j.status === "completed");
  const failed = jobs.filter((j) => j.status === "failed");
  const last24h = jobs.filter(
    (j) => now - new Date(j.startedAt).getTime() < DAY_MS
  );
  const last7d = jobs.filter(
    (j) => now - new Date(j.startedAt).getTime() < WEEK_MS
  );

  const completedDurations = completed
    .map((j) => j.durationMs ?? 0)
    .filter((d) => d > 0);

  const successRate =
    jobs.length > 0
      ? completed.length / (completed.length + failed.length || 1)
      : 0;

  const stageDurations = new Map<string, number[]>();
  for (const job of completed) {
    for (const stage of job.stages) {
      if (stage.durationMs == null || stage.durationMs <= 0) continue;
      const arr = stageDurations.get(stage.name) ?? [];
      arr.push(stage.durationMs);
      stageDurations.set(stage.name, arr);
    }
  }

  const stages = Array.from(stageDurations.entries())
    .map(([name, durations]) => ({
      name,
      sampleSize: durations.length,
      avgMs: Math.round(average(durations)),
      p95Ms: Math.round(percentile(durations, 95)),
    }))
    .sort((a, b) => b.sampleSize - a.sampleSize);

  return NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      jobs: {
        totalRecorded: jobs.length,
        completed: completed.length,
        failed: failed.length,
        last24h: last24h.length,
        last7d: last7d.length,
      },
      successRate,
      renderTime: {
        sampleSize: completedDurations.length,
        avgMs: Math.round(average(completedDurations)),
        p50Ms: Math.round(percentile(completedDurations, 50)),
        p95Ms: Math.round(percentile(completedDurations, 95)),
        p99Ms: Math.round(percentile(completedDurations, 99)),
      },
      stages,
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store, max-age=0" },
    }
  );
}
