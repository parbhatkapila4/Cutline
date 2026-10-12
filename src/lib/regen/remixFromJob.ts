import { getVideoQueue, type VideoJobData } from "@/lib/queue/videoQueue";
import { validateJobId } from "@/lib/validation/input";
import { isDatabaseConfigured } from "@/lib/db/client";

export type RemixMergeResult =
  | { ok: true; merged: Record<string, unknown>; remixFromJobId: string }
  | { ok: false; message: string };

function stripUndefined<T extends Record<string, unknown>>(o: T): T {
  const out = { ...o };
  for (const k of Object.keys(out)) {
    if (out[k] === undefined) delete out[k];
  }
  return out;
}
export async function mergeRemixFromJob(
  body: Record<string, unknown>,
  opts: { userId?: string; request: Request }
): Promise<RemixMergeResult> {
  const raw = body.remixFromJobId;
  const remixFromJobId = typeof raw === "string" ? raw.trim() : "";
  if (!remixFromJobId) {
    return { ok: false, message: "remixFromJobId is required for remix." };
  }
  const jv = validateJobId(remixFromJobId);
  if (!jv.valid) {
    return { ok: false, message: jv.error };
  }

  let jd: VideoJobData | undefined;
  if (opts.userId && isDatabaseConfigured()) {
    const { findVideoJobForOwners } = await import("@/lib/jobs/videoJobService");
    const row = await findVideoJobForOwners(remixFromJobId, [opts.userId]);
    if (row?.job_data) jd = row.job_data;
  }

  if (!jd) {
    const job = await getVideoQueue().getJob(remixFromJobId);
    if (!job) {
      return { ok: false, message: "Source job not found." };
    }
    const queued = job.data as VideoJobData;
    const owns =
      opts.userId != null &&
      (queued.userId === opts.userId || queued.clientId === opts.userId);
    if (!owns) {
      return { ok: false, message: "Cannot remix this job (wrong account or session)." };
    }
    jd = queued;
  }

  const defaults: Record<string, unknown> = stripUndefined({
    input: jd.input,
    durationSeconds: jd.durationSeconds,
    mode: jd.mode,
    captions: jd.captions,
    platform: jd.platform,
    aspectRatio: jd.aspectRatio,
    brandColors: jd.brandColors,
    brandBrain: jd.brandBrain,
    locale: jd.locale,
    ttsVoiceId: jd.ttsVoiceId,
    characterLockId: jd.characterLockId,
    talkingObjectStyle: jd.talkingObjectStyle,
    avatar: jd.avatar,
    textModel: jd.textModel,
    variationCount: jd.variationCount,
    qualityGateMode: jd.qualityGateMode,
    scriptFidelity: jd.scriptFidelity,
    strictScript: jd.strictScript,
    assetIds: jd.assetIds,
    placeholders: jd.placeholders,
  });

  const { remixFromJobId: _drop, ...rest } = body;
  const merged = { ...defaults, ...rest };
  return { ok: true, merged, remixFromJobId };
}
