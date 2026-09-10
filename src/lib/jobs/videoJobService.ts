import type { VideoJob, VideoJobInsert, VideoJobStatus, OwnerType } from "@/lib/db/types";
import { getSql, isDatabaseConfigured } from "@/lib/db/client";

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
};

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
  };
}

export async function createVideoJob(insert: VideoJobInsert): Promise<{ id: string }> {
  const sql = getSql();
  const status = insert.status ?? "queued";
  const rows = (await sql`
    INSERT INTO video_jobs (owner_type, owner_id, prompt, status, preview_url, final_url, queue_job_id)
    VALUES (
      ${insert.owner_type}::video_job_owner_type,
      ${insert.owner_id},
      ${insert.prompt},
      ${status}::video_job_status,
      ${insert.preview_url ?? null},
      ${insert.final_url ?? null},
      ${insert.queue_job_id ?? null}
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
        SELECT id, owner_type, owner_id, prompt, status, preview_url, final_url, created_at, queue_job_id
        FROM video_jobs
        WHERE id = ${jobId}::uuid OR queue_job_id = ${jobId}
        ORDER BY created_at DESC
        LIMIT 1
      `) as VideoJobRow[])
    : ((await sql`
        SELECT id, owner_type, owner_id, prompt, status, preview_url, final_url, created_at, queue_job_id
        FROM video_jobs
        WHERE queue_job_id = ${jobId}
        ORDER BY created_at DESC
        LIMIT 1
      `) as VideoJobRow[]);
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
    SELECT id, owner_type, owner_id, prompt, status, preview_url, final_url, created_at, queue_job_id
    FROM video_jobs
    WHERE owner_type = ${ownerType}::video_job_owner_type AND owner_id = ${ownerId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return (Array.isArray(rows) ? rows : []).map((r) => mapRow(r as VideoJobRow));
}

export async function findVideoJobsByAnonSession(
  anonSessionId: string
): Promise<VideoJob[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT id, owner_type, owner_id, prompt, status, preview_url, final_url, created_at, queue_job_id
    FROM video_jobs
    WHERE owner_type = 'anon' AND owner_id = ${anonSessionId}
  `;
  return (Array.isArray(rows) ? rows : []).map((r) => mapRow(r as VideoJobRow));
}

export async function migrateAnonJobsToUser(
  anonSessionId: string,
  userId: string
): Promise<{ migrated: number }> {
  const sql = getSql();
  const rows = await sql`
    UPDATE video_jobs
    SET owner_type = 'user'::video_job_owner_type, owner_id = ${userId}
    WHERE owner_type = 'anon' AND owner_id = ${anonSessionId}
    RETURNING id
  `;
  return { migrated: Array.isArray(rows) ? rows.length : 0 };
}

export async function deleteVideoJobRelatedDbRows(
  bullJobId: string,
  clientId: string
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
  try {
    await sql`
      DELETE FROM video_jobs
      WHERE (queue_job_id = ${bullJobId} OR id::text = ${bullJobId})
        AND owner_id = ${clientId}
    `;
  } catch (e) {
    console.warn(
      "[videoJobService] delete video_jobs failed:",
      e instanceof Error ? e.message : String(e)
    );
  }
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

export async function updateVideoJobStatusByQueueId(
  queueJobId: string,
  status: VideoJobStatus,
  options?: { preview_url?: string | null; final_url?: string | null }
): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;
  const sql = getSql();
  const rows = await sql`
    UPDATE video_jobs
    SET
      status = ${status}::video_job_status,
      preview_url = COALESCE(${options?.preview_url ?? null}, preview_url),
      final_url = COALESCE(${options?.final_url ?? null}, final_url)
    WHERE queue_job_id = ${queueJobId}
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
