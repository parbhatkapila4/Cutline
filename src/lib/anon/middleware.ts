/**
 * Middleware helpers for anonymous session management.
 * Use in API routes: resolve anon session from cookie, create if missing.
 */

import { getAnonSessionIdFromRequest } from "./cookie";
import { getAnonSessionById, createAnonSession } from "./anonSessionService";

export type AnonSessionContext =
  | { hasSession: true; anonSessionId: string }
  | { hasSession: false; anonSessionId: null };

/**
 * Get current anon session id from request (cookie only). Does not create.
 */
export function getAnonSessionFromRequest(request: Request): AnonSessionContext {
  const id = getAnonSessionIdFromRequest(request);
  if (id) return { hasSession: true, anonSessionId: id };
  return { hasSession: false, anonSessionId: null };
}

/**
 * Ensure an anon session exists: read from cookie (and validate in DB), or create and persist.
 * Returns session id and a cookie header to set on response if session was created.
 * Caller must add setCookieHeader to Response when present.
 */
export async function ensureAnonSession(request: Request): Promise<{
  anonSessionId: string;
  setCookieHeader: string | null;
}> {
  const existing = getAnonSessionIdFromRequest(request);
  if (existing) {
    try {
      const session = await getAnonSessionById(existing);
      if (session) return { anonSessionId: existing, setCookieHeader: null };
    } catch {
      // DB not configured or error; treat as no session and create new
    }
  }
  const session = await createAnonSession();
  const { buildAnonSessionCookieHeader } = await import("./cookie");
  return {
    anonSessionId: session.id,
    setCookieHeader: buildAnonSessionCookieHeader(session.id),
  };
}

/**
 * For routes that require a valid anon session to exist in DB (e.g. after DB is connected).
 * Returns session or null if cookie missing or session not found.
 */
export async function getAnonSessionStrict(request: Request): Promise<{
  anonSessionId: string;
  generationCount: number;
} | null> {
  const id = getAnonSessionIdFromRequest(request);
  if (!id) return null;
  const session = await getAnonSessionById(id);
  if (!session) return null;
  return {
    anonSessionId: session.id,
    generationCount: session.generation_count,
  };
}
