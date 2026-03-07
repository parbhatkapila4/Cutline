export type JobTelemetryStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed";

export interface StageTelemetry {
  name: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
}

export interface JobTelemetry {
  jobId: string;
  requestId?: string;
  status: JobTelemetryStatus;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  stages: StageTelemetry[];
  error?: string;
  platform?: string;
  variationCount?: number;
}
