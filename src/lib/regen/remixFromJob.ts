import { getVideoQueue, type VideoJobData } from "@/lib/queue/videoQueue";
import { validateJobId } from "@/lib/validation/input";
import { getAnonSessionIdFromRequest } from "@/lib/anon/cookie";

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

  const queue = getVideoQueue();
  const job = await queue.getJob(remixFromJobId);
  if (!job) {
    return { ok: false, message: "Source job not found." };
  }

  const jd = job.data as VideoJobData;
  const anonId = getAnonSessionIdFromRequest(opts.request);
  const owns =
    (opts.userId != null &&
      (jd.userId === opts.userId || jd.clientId === opts.userId)) ||
    (opts.userId == null && anonId != null && jd.clientId === anonId);

  if (!owns) {
    return { ok: false, message: "Cannot remix this job (wrong account or session)." };
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
