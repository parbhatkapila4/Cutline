const ERROR_MAX_LENGTH = 500;

export type PipelineEventPayload = {
  jobId: string;
  event: string;
  stage?: string;
  durationMs?: number;
  videoPath?: string;
  error?: string | Error;
  requestId?: string;
};

function truncateError(value: string | Error): string {
  const msg = value instanceof Error ? value.message : String(value);
  if (msg.length <= ERROR_MAX_LENGTH) return msg;
  return msg.slice(0, ERROR_MAX_LENGTH) + "…";
}

export function logPipelineEvent(payload: PipelineEventPayload): void {
  const obj: Record<string, string | number> = {
    ts: new Date().toISOString(),
    jobId: payload.jobId,
    event: payload.event,
  };
  if (payload.requestId !== undefined) obj.requestId = payload.requestId;
  if (payload.stage !== undefined) obj.stage = payload.stage;
  if (payload.durationMs !== undefined) obj.durationMs = payload.durationMs;
  if (payload.videoPath !== undefined) obj.videoPath = payload.videoPath;
  if (payload.error !== undefined && payload.error !== null) {
    obj.error = truncateError(payload.error);
  }
  console.log("[pipeline] " + JSON.stringify(obj));
}
