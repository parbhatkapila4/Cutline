import type { GenerationFlowResult } from "@/lib/db/types";
import { ensureAnonSession } from "./middleware";
import { getAnonSessionById, incrementAnonGenerationCount } from "./anonSessionService";
import { createVideoJob } from "@/lib/jobs/videoJobService";

const ANON_FREE_GENERATIONS = 1;

export type GenerationFlowOutput = {
  result: GenerationFlowResult;
  setCookieHeader: string | null;
};

export async function runGenerationFlow(
  request: Request,
  prompt: string
): Promise<GenerationFlowOutput> {
  const { anonSessionId, setCookieHeader } = await ensureAnonSession(request);

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
