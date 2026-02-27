/**
 * Generation flow: anonymous first-video allowance and gating.
 * 1. Ensure anon session (cookie or create).
 * 2. If generation_count >= 1 → block, require auth.
 * 3. Else: create video_job, increment generation_count, return job id.
 */

import type { GenerationFlowResult } from "@/lib/db/types";
import { ensureAnonSession } from "./middleware";
import { getAnonSessionById, incrementAnonGenerationCount } from "./anonSessionService";
import { createVideoJob } from "@/lib/jobs/videoJobService";

const ANON_FREE_GENERATIONS = 1;

export type GenerationFlowOutput = {
  result: GenerationFlowResult;
  setCookieHeader: string | null;
};

/**
 * Run the anonymous generation flow.
 * - If no anon cookie: create session (and persist when DB connected), set cookie.
 * - If anon session has generation_count >= 1: return allowed: false, reason: anon_limit_reached.
 * - Else: create video_job (owner_type=anon, owner_id=anon_session_id), increment generation_count, return job id.
 * Caller must attach setCookieHeader to response when present.
 */
export async function runGenerationFlow(
  request: Request,
  prompt: string
): Promise<GenerationFlowOutput> {
  const { anonSessionId, setCookieHeader } = await ensureAnonSession(request);

  // TODO: When DB is connected, use getAnonSessionById(anonSessionId) for generation_count.
  // Until then we have no persisted count; allow one by not blocking.
  const session = await getAnonSessionById(anonSessionId);
  const generationCount = session?.generation_count ?? 0;

  if (generationCount >= ANON_FREE_GENERATIONS) {
    return {
      result: {
        allowed: false,
        reason: "anon_limit_reached",
        anon_session_id: anonSessionId,
      },
      setCookieHeader,
    };
  }

  const { id: jobId } = await createVideoJob({
    owner_type: "anon",
    owner_id: anonSessionId,
    prompt,
    status: "queued",
    preview_url: null,
    final_url: null,
  });

  await incrementAnonGenerationCount(anonSessionId);

  return {
    result: {
      allowed: true,
      anon_session_id: anonSessionId,
      job_id: jobId,
    },
    setCookieHeader,
  };
}
