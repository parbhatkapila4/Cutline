/**
 * Anonymous session cookie: HTTP-only, used to persist anon_session_id.
 * Do NOT use IP or frontend-only tracking; this cookie is the source of truth.
 */

export const ANON_SESSION_COOKIE_NAME = "cutline_anon_session";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year
const COOKIE_PATH = "/";

/**
 * Read anon_session_id from request cookies.
 * Returns null if missing or invalid (not a UUID).
 */
export function getAnonSessionIdFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader.match(
    new RegExp(`${ANON_SESSION_COOKIE_NAME}=([^;]+)`, "i")
  );
  const value = match?.[1]?.trim();
  if (!value) return null;
  const decoded = decodeURIComponent(value);
  if (!isValidUuid(decoded)) return null;
  return decoded;
}

/**
 * Build Set-Cookie header value for anon session (HTTP-only, SameSite=Lax).
 * Caller should add this to Response headers.
 */
export function buildAnonSessionCookieHeader(sessionId: string): string {
  const encoded = encodeURIComponent(sessionId);
  return [
    `${ANON_SESSION_COOKIE_NAME}=${encoded}`,
    "Path=" + COOKIE_PATH,
    "Max-Age=" + COOKIE_MAX_AGE_SECONDS,
    "HttpOnly",
    "SameSite=Lax",
    "Secure",
  ].join("; ");
}

function isValidUuid(s: string): boolean {
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRe.test(s);
}
