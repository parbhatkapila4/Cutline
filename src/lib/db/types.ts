import type { VideoJobData, VideoJobResult } from "@/lib/queue/videoQueue";

export type OwnerType = "anon" | "user";
export type VideoJobStatus = "queued" | "processing" | "completed" | "failed";
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
  job_data?: VideoJobData | null;
  result?: VideoJobResult | null;
  error?: string | null;
  queue_name?: string | null;
  started_at?: Date | null;
  finished_at?: Date | null;
};

export type VideoJobInsert = {
  owner_type: OwnerType;
  owner_id: string;
  prompt: string;
  status?: VideoJobStatus;
  preview_url?: string | null;
  final_url?: string | null;
  queue_job_id?: string | null;
  job_data?: VideoJobData | null;
  queue_name?: string | null;
};
