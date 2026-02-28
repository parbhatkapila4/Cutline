/**
 * Database types for Cutline hybrid anonymous → authenticated funnel.
 * No DB connection here; used by services and schema.
 */

export type OwnerType = "anon" | "user";

export type VideoJobStatus = "queued" | "processing" | "completed" | "failed";

/**
 * Anonymous session: one per visitor until they auth or hit limit.
 */
export type AnonSession = {
  id: string;
  created_at: Date;
  generation_count: number;
};

/**
 * Video job with polymorphic owner (anon_session_id or user_id).
 * queue_job_id links to BullMQ job id when worker is used.
 */
export type VideoJob = {
  id: string;
  owner_type: OwnerType;
  owner_id: string;
  prompt: string;
  status: VideoJobStatus;
  preview_url: string | null;
  final_url: string | null;
  created_at: Date;
  queue_job_id?: string | null;
};

/**
 * Input for creating a video job (service layer).
 */
export type VideoJobInsert = {
  owner_type: OwnerType;
  owner_id: string;
  prompt: string;
  status?: VideoJobStatus;
  preview_url?: string | null;
  final_url?: string | null;
};

/**
 * Result of generation flow: either allowed with job id or blocked (auth required).
 */
export type GenerationFlowResult =
  | { allowed: true; anon_session_id: string; job_id: string }
  | { allowed: false; reason: "anon_limit_reached"; anon_session_id: string };

/**
 * Result of download gate check.
 */
export type DownloadGateResult =
  | { allowed: true; job_id: string }
  | { allowed: false; reason: "auth_required" }
  | { allowed: false; reason: "not_found" };
