import { getAnonSessionIdFromRequest } from "./cookie";
import { getAnonSessionById, createAnonSession } from "./anonSessionService";

export type AnonSessionContext =
  | { hasSession: true; anonSessionId: string }
  | { hasSession: false; anonSessionId: null };

export function getAnonSessionFromRequest(request: Request): AnonSessionContext {
  const id = getAnonSessionIdFromRequest(request);
  if (id) return { hasSession: true, anonSessionId: id };
  return { hasSession: false, anonSessionId: null };
}

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
    }
  }
  const session = await createAnonSession();
  const { buildAnonSessionCookieHeader } = await import("./cookie");
  return {
    anonSessionId: session.id,
    setCookieHeader: buildAnonSessionCookieHeader(session.id),
  };
}

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
