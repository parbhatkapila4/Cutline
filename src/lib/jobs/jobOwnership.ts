import { auth } from "@/lib/auth";
import { getAnonSessionIdFromRequest } from "@/lib/anon/cookie";
import { getClientIdentifier } from "@/lib/rate-limit";

const SESSION_LOOKUP_TIMEOUT_MS = 8000;

async function getSessionUserId(request: Request): Promise<string | null> {
  const result = await Promise.race([
    auth.api.getSession({ headers: request.headers }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("getSession timed out")), SESSION_LOOKUP_TIMEOUT_MS)
    ),
  ]);
  const userId = result?.user?.id;
  return typeof userId === "string" && userId.trim() ? userId : null;
}

export async function resolveOwnerCandidates(request: Request): Promise<string[]> {
  const candidates: string[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const userId = await getSessionUserId(request);
      if (userId) candidates.push(userId);
      break;
    } catch {
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
    }
  }
  const anonId = getAnonSessionIdFromRequest(request);
  if (anonId) candidates.push(anonId);
  candidates.push(getClientIdentifier(request));
  return candidates;
}

export async function resolveOwnerIdentifier(request: Request): Promise<string> {
  const [first] = await resolveOwnerCandidates(request);
  return first ?? getClientIdentifier(request);
}

export async function requestOwnsResource(
  request: Request,
  ownerId: string | null | undefined
): Promise<boolean> {
  if (typeof ownerId !== "string" || ownerId.trim() === "") return false;
  const candidates = await resolveOwnerCandidates(request);
  return candidates.includes(ownerId);
}
