export type OwnerType = "anon" | "user";
export type VideoJobStatus = "queued" | "processing" | "completed" | "failed";
export type AnonSession = {
  id: string;
  created_at: Date;
  generation_count: number;
};

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

export type VideoJobInsert = {
  owner_type: OwnerType;
  owner_id: string;
  prompt: string;
  status?: VideoJobStatus;
  preview_url?: string | null;
  final_url?: string | null;
};

export type GenerationFlowResult =
  | { allowed: true; anon_session_id: string; job_id: string }
  | { allowed: false; reason: "anon_limit_reached"; anon_session_id: string };

export type DownloadGateResult =
  | { allowed: true; job_id: string }
  | { allowed: false; reason: "auth_required" }
  | { allowed: false; reason: "not_found" };
