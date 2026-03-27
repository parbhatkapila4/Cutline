import type { VideoJob, VideoJobInsert, VideoJobStatus, OwnerType } from "@/lib/db/types";
import { getSql } from "@/lib/db/client";

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
    INSERT INTO video_jobs (owner_type, owner_id, prompt, status, preview_url, final_url)
    VALUES (
      ${insert.owner_type}::video_job_owner_type,
      ${insert.owner_id}::uuid,
      ${insert.prompt},
      ${status}::video_job_status,
      ${insert.preview_url ?? null},
      ${insert.final_url ?? null}
    )
    RETURNING id
  `) as { id: string }[];
  const row = rows[0];
  if (!row || typeof row !== "object" || typeof (row as { id?: string }).id !== "string") {
    throw new Error("Failed to create video job");
  }
  return { id: (row as { id: string }).id };
}

export async function getVideoJobById(jobId: string): Promise<VideoJob | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, owner_type, owner_id, prompt, status, preview_url, final_url, created_at, queue_job_id
    FROM video_jobs
    WHERE id = ${jobId}::uuid
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
    SELECT id, owner_type, owner_id, prompt, status, preview_url, final_url, created_at, queue_job_id
    FROM video_jobs
    WHERE owner_type = ${ownerType}::video_job_owner_type AND owner_id = ${ownerId}::uuid
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
    WHERE owner_type = 'anon' AND owner_id = ${anonSessionId}::uuid
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
    SET owner_type = 'user'::video_job_owner_type, owner_id = ${userId}::uuid
    WHERE owner_type = 'anon' AND owner_id = ${anonSessionId}::uuid
    RETURNING id
  `;
  return { migrated: Array.isArray(rows) ? rows.length : 0 };
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
