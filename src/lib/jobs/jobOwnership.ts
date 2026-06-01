import { auth } from "@/lib/auth";
import { getAnonSessionIdFromRequest } from "@/lib/anon/cookie";
import { getClientIdentifier } from "@/lib/rate-limit";

export async function resolveOwnerCandidates(request: Request): Promise<string[]> {
  const candidates: string[] = [];
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const userId = session?.user?.id;
    if (typeof userId === "string" && userId.trim()) candidates.push(userId);
  } catch {
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
