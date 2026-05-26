import { auth } from "@/lib/auth";
import { getAnonSessionIdFromRequest } from "@/lib/anon/cookie";
import { getClientIdentifier } from "@/lib/rate-limit";

/**
 * Job/asset ownership resolution.
 *
 * A job records `clientId` at creation time, derived as:
 *   userId (logged in) ?? anon_session_id (anon cookie) ?? client IP identifier
 *
 * To authorize access we resolve the SAME set of identifiers from the
 * incoming request and check the recorded owner against them. This mirrors
 * the pattern already used by the dashboard edit route, kept in one place so
 * every owner-scoped endpoint stays consistent.
 */

/**
 * Every identifier the caller could legitimately own a resource under, in
 * priority order (userId, anon cookie id, IP identifier).
 */
export async function resolveOwnerCandidates(request: Request): Promise<string[]> {
  const candidates: string[] = [];
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const userId = session?.user?.id;
    if (typeof userId === "string" && userId.trim()) candidates.push(userId);
  } catch {
    // session lookup failures (DB down, no auth configured) fall through to
    // anon/IP candidates — never throw out of an authorization check.
  }
  const anonId = getAnonSessionIdFromRequest(request);
  if (anonId) candidates.push(anonId);
  candidates.push(getClientIdentifier(request));
  return candidates;
}

/**
 * The single canonical owner identifier for a request — used when STORING the
 * owner on a new resource. Matches the `creditsIdentifier` priority used when
 * a job is created so reads line up with writes.
 */
export async function resolveOwnerIdentifier(request: Request): Promise<string> {
  const [first] = await resolveOwnerCandidates(request);
  return first ?? getClientIdentifier(request);
}

/**
 * True when the request's caller owns the resource identified by `ownerId`.
 * Fails closed: a null/empty recorded owner is never considered owned.
 */
export async function requestOwnsResource(
  request: Request,
  ownerId: string | null | undefined
): Promise<boolean> {
  if (typeof ownerId !== "string" || ownerId.trim() === "") return false;
  const candidates = await resolveOwnerCandidates(request);
  return candidates.includes(ownerId);
}
