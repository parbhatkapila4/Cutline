import type { VideoJob, VideoJobInsert, VideoJobStatus, OwnerType } from "@/lib/db/types";
import type { VideoJobData, VideoJobResult } from "@/lib/queue/videoQueue";
import { getSql, isDatabaseConfigured } from "@/lib/db/client";
import { redactSecrets } from "@/lib/telemetry/renderEvents";

type VideoJobRow = {
  id: string;
  owner_type: string;
  owner_id: string;
  prompt: string;
  status: string;
  preview_url: string | null;
  final_url: string | null;
  created_at: Date;
  queue_job_id?: string | null;
  job_data?: unknown;
  result?: unknown;
  error?: string | null;
  queue_name?: string | null;
  started_at?: Date | string | null;
  finished_at?: Date | string | null;
};

function toDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toJson<T>(value: unknown): T | null {
  if (value == null) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return typeof value === "object" ? (value as T) : null;
}

function mapRow(row: VideoJobRow): VideoJob {
  return {
    id: row.id,
    owner_type: row.owner_type as OwnerType,
    owner_id: row.owner_id,
    prompt: row.prompt,
    status: row.status as VideoJobStatus,
    preview_url: row.preview_url ?? null,
    final_url: row.final_url ?? null,
    created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
    queue_job_id: row.queue_job_id ?? null,
    job_data: toJson<VideoJobData>(row.job_data),
    result: toJson<VideoJobResult>(row.result),
    error: row.error ?? null,
    queue_name: row.queue_name ?? null,
    started_at: toDate(row.started_at),
    finished_at: toDate(row.finished_at),
  };
}

export function isTerminalVideoJobStatus(status: VideoJobStatus): boolean {
  return status === "completed" || status === "failed";
}

function storedJobData(data: VideoJobData | null | undefined): string | null {
  if (data == null) return null;
  const stored: Partial<VideoJobData> = { ...data };
  delete stored.callbackUrl;
  return JSON.stringify(stored);
}

export async function createVideoJob(insert: VideoJobInsert): Promise<{ id: string }> {
  const sql = getSql();
  const status = insert.status ?? "queued";
  const jobData = storedJobData(insert.job_data);
  const rows = (await sql`
    INSERT INTO video_jobs (owner_type, owner_id, prompt, status, preview_url, final_url, queue_job_id, job_data, queue_name)
    VALUES (
      ${insert.owner_type}::video_job_owner_type,
      ${insert.owner_id},
      ${insert.prompt},
      ${status}::video_job_status,
      ${insert.preview_url ?? null},
      ${insert.final_url ?? null},
      ${insert.queue_job_id ?? null},
      ${jobData}::jsonb,
      ${insert.queue_name ?? null}
    )
    RETURNING id
  `) as { id: string }[];
  const row = rows[0];
  if (!row || typeof row !== "object" || typeof (row as { id?: string }).id !== "string") {
    throw new Error("Failed to create video job");
  }
  return { id: (row as { id: string }).id };
}

const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export async function getVideoJobById(jobId: string): Promise<VideoJob | null> {
  const sql = getSql();
  const rows = UUID_RE.test(jobId)
    ? ((await sql`
        SELECT id, owner_type, owner_id, prompt, status, preview_url, final_url, created_at, queue_job_id,
               job_data, result, error, queue_name, started_at, finished_at
        FROM video_jobs
        WHERE id = ${jobId}::uuid OR queue_job_id = ${jobId}
        ORDER BY created_at DESC
        LIMIT 1
      `) as VideoJobRow[])
    : ((await sql`
        SELECT id, owner_type, owner_id, prompt, status, preview_url, final_url, created_at, queue_job_id,
               job_data, result, error, queue_name, started_at, finished_at
        FROM video_jobs
        WHERE queue_job_id = ${jobId}
        ORDER BY created_at DESC
        LIMIT 1
      `) as VideoJobRow[]);
  const row = rows[0];
  if (!row || typeof row !== "object") return null;
  return mapRow(row as VideoJobRow);
}

export async function findVideoJobForOwners(
  jobId: string,
  ownerIds: string[]
): Promise<VideoJob | null> {
  if (ownerIds.length === 0) return null;
  const sql = getSql();
  const rows = (await sql`
    SELECT id, owner_type, owner_id, prompt, status, preview_url, final_url, created_at, queue_job_id,
           job_data, result, error, queue_name, started_at, finished_at
    FROM video_jobs
    WHERE (queue_job_id = ${jobId} OR id::text = ${jobId})
      AND owner_type = 'user'::video_job_owner_type
      AND owner_id = ANY(${ownerIds})
    ORDER BY created_at DESC
    LIMIT 1
  `) as VideoJobRow[];
  const row = rows[0];
  if (!row || typeof row !== "object") return null;
  return mapRow(row as VideoJobRow);
}

export async function listVideoJobsByOwner(
  ownerType: OwnerType,
  ownerId: string,
  limit: number = 50
): Promise<VideoJob[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT id, owner_type, owner_id, prompt, status, preview_url, final_url, created_at, queue_job_id,
           job_data, result, error, queue_name, started_at, finished_at
    FROM video_jobs
    WHERE owner_type = ${ownerType}::video_job_owner_type AND owner_id = ${ownerId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return (Array.isArray(rows) ? rows : []).map((r) => mapRow(r as VideoJobRow));
}

export async function listVideoJobsForOwners(
  ownerIds: string[],
  limit: number
): Promise<VideoJob[]> {
  if (ownerIds.length === 0) return [];
  const sql = getSql();
  const rows = await sql`
    SELECT id, owner_type, owner_id, prompt, status, preview_url, final_url, created_at, queue_job_id,
           job_data, result, error, queue_name, started_at, finished_at
    FROM video_jobs
    WHERE owner_type = 'user'::video_job_owner_type AND owner_id = ANY(${ownerIds})
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return (Array.isArray(rows) ? rows : []).map((r) => mapRow(r as VideoJobRow));
}

export async function listRecentFinishedVideoJobs(
  ownerId: string,
  limit: number
): Promise<VideoJob[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT id, owner_type, owner_id, prompt, status, preview_url, final_url, created_at, queue_job_id,
           job_data, result, error, queue_name, started_at, finished_at
    FROM video_jobs
    WHERE owner_type = 'user'::video_job_owner_type AND owner_id = ${ownerId}
      AND status IN ('completed'::video_job_status, 'failed'::video_job_status)
    ORDER BY COALESCE(finished_at, created_at) DESC
    LIMIT ${limit}
  `;
  return (Array.isArray(rows) ? rows : []).map((r) => mapRow(r as VideoJobRow));
}

export type VideoJobOverview = {
  totalVideos: number;
  thisWeek: number;
  inProgress: number;
  totalDurationSec: number;
  totalCostUsd: number;
};

export async function getVideoJobOverview(ownerId: string, weekStart: Date): Promise<VideoJobOverview> {
  const sql = getSql();
  const rows = (await sql`
    SELECT
      count(*) FILTER (WHERE status = 'completed'::video_job_status) AS total_videos,
      count(*) FILTER (
        WHERE status = 'completed'::video_job_status AND COALESCE(finished_at, created_at) >= ${weekStart}
      ) AS this_week,
      count(*) FILTER (
        WHERE status IN ('queued'::video_job_status, 'processing'::video_job_status)
      ) AS in_progress,
      COALESCE(sum(
        CASE WHEN jsonb_typeof(job_data->'durationSeconds') = 'number'
          THEN (job_data->>'durationSeconds')::numeric END
      ) FILTER (WHERE status = 'completed'::video_job_status), 0) AS total_duration_sec,
      COALESCE(sum(
        CASE WHEN jsonb_typeof(result->'cost'->'total') = 'number'
          THEN (result->'cost'->>'total')::numeric END
      ) FILTER (WHERE status = 'completed'::video_job_status), 0) AS total_cost_usd
    FROM video_jobs
    WHERE owner_type = 'user'::video_job_owner_type AND owner_id = ${ownerId}
  `) as Array<Record<string, unknown>>;
  const row = rows[0] ?? {};
  const num = (v: unknown) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  return {
    totalVideos: num(row.total_videos),
    thisWeek: num(row.this_week),
    inProgress: num(row.in_progress),
    totalDurationSec: num(row.total_duration_sec),
    totalCostUsd: num(row.total_cost_usd),
  };
}

export async function listOpenVideoJobs(options: {
  olderThanMinutes: number;
  queueNames: string[];
  limit: number;
}): Promise<VideoJob[]> {
  if (!isDatabaseConfigured()) return [];
  const sql = getSql();
  const rows = await sql`
    SELECT id, owner_type, owner_id, prompt, status, preview_url, final_url, created_at, queue_job_id,
           job_data, result, error, queue_name, started_at, finished_at
    FROM video_jobs
    WHERE status IN ('queued'::video_job_status, 'processing'::video_job_status)
      AND queue_job_id IS NOT NULL
      AND created_at < now() - (${options.olderThanMinutes} * interval '1 minute')
      AND (queue_name IS NULL OR queue_name = ANY(${options.queueNames}))
    ORDER BY created_at ASC
    LIMIT ${options.limit}
  `;
  return (Array.isArray(rows) ? rows : []).map((r) => mapRow(r as VideoJobRow));
}

export async function deleteVideoJobRelatedDbRows(
  bullJobId: string,
  ownerIds: string[]
): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const sql = getSql();
  try {
    await sql`DELETE FROM job_comments WHERE job_id = ${bullJobId}`;
  } catch (e) {
    console.warn(
      "[videoJobService] delete job_comments failed:",
      e instanceof Error ? e.message : String(e)
    );
  }
  try {
    await sql`DELETE FROM job_approvals WHERE job_id = ${bullJobId}`;
  } catch (e) {
    console.warn(
      "[videoJobService] delete job_approvals failed:",
      e instanceof Error ? e.message : String(e)
    );
  }
  await sql`
    DELETE FROM video_jobs
    WHERE (queue_job_id = ${bullJobId} OR id::text = ${bullJobId})
      AND owner_type = 'user'::video_job_owner_type
      AND owner_id = ANY(${ownerIds})
  `;
}

export async function deleteOpenVideoJob(queueJobId: string): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;
  const sql = getSql();
  const rows = await sql`
    DELETE FROM video_jobs
    WHERE queue_job_id = ${queueJobId} AND status = 'queued'::video_job_status
    RETURNING id
  `;
  return Array.isArray(rows) && rows.length > 0;
}

export async function getPlanIdsByFinalUrl(
  urls: string[]
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!isDatabaseConfigured() || urls.length === 0) return out;
  const sql = getSql();
  const rows = (await sql`
    SELECT vj.final_url AS final_url, upo.plan AS plan
    FROM video_jobs vj
    LEFT JOIN user_plan_overrides upo ON upo.user_id = vj.owner_id
    WHERE vj.final_url = ANY(${urls})
      AND vj.owner_type = 'user'::video_job_owner_type
  `) as Array<{ final_url: string | null; plan: string | null }>;
  for (const row of Array.isArray(rows) ? rows : []) {
    if (typeof row?.final_url === "string" && typeof row?.plan === "string") {
      out.set(row.final_url, row.plan);
    }
  }
  return out;
}

export async function clearFinalUrls(urls: string[]): Promise<number> {
  if (!isDatabaseConfigured() || urls.length === 0) return 0;
  const sql = getSql();
  const rows = await sql`
    UPDATE video_jobs
    SET final_url = NULL
    WHERE final_url = ANY(${urls})
    RETURNING id
  `;
  return Array.isArray(rows) ? rows.length : 0;
}

export async function markVideoJobProcessing(queueJobId: string): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;
  const sql = getSql();
  const rows = await sql`
    UPDATE video_jobs
    SET status = 'processing'::video_job_status,
        started_at = COALESCE(started_at, now())
    WHERE queue_job_id = ${queueJobId}
      AND status = 'queued'::video_job_status
    RETURNING id
  `;
  return Array.isArray(rows) && rows.length > 0;
}

export async function markVideoJobCompleted(
  queueJobId: string,
  outcome: { finalUrl: string | null; result: VideoJobResult | null }
): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;
  const sql = getSql();
  const result = outcome.result == null ? null : JSON.stringify(outcome.result);
  const rows = await sql`
    UPDATE video_jobs
    SET status = 'completed'::video_job_status,
        final_url = COALESCE(${outcome.finalUrl}, final_url),
        result = ${result}::jsonb,
        error = NULL,
        started_at = COALESCE(started_at, now()),
        finished_at = now()
    WHERE queue_job_id = ${queueJobId}
      AND status IN ('queued'::video_job_status, 'processing'::video_job_status)
    RETURNING id
  `;
  return Array.isArray(rows) && rows.length > 0;
}

export async function markVideoJobFailed(
  queueJobId: string,
  error: string | null
): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;
  const sql = getSql();
  const stored = error == null || error.trim() === "" ? null : redactSecrets(error);
  const rows = await sql`
    UPDATE video_jobs
    SET status = 'failed'::video_job_status,
        error = ${stored},
        finished_at = now()
    WHERE queue_job_id = ${queueJobId}
      AND status IN ('queued'::video_job_status, 'processing'::video_job_status)
    RETURNING id
  `;
  return Array.isArray(rows) && rows.length > 0;
}

export async function updateVideoJobStatus(
  jobId: string,
  status: VideoJobStatus,
  options?: { preview_url?: string | null; final_url?: string | null }
): Promise<boolean> {
  const sql = getSql();
  if (options?.preview_url !== undefined || options?.final_url !== undefined) {
    await sql`
      UPDATE video_jobs
      SET
        status = ${status}::video_job_status,
        preview_url = COALESCE(${options.preview_url ?? null}, preview_url),
        final_url = COALESCE(${options.final_url ?? null}, final_url)
      WHERE id = ${jobId}::uuid
    `;
  } else {
    await sql`
      UPDATE video_jobs
      SET status = ${status}::video_job_status
      WHERE id = ${jobId}::uuid
    `;
  }
  return true;
}
