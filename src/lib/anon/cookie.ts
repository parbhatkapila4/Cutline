export const ANON_SESSION_COOKIE_NAME = "cutline_anon_session";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const COOKIE_PATH = "/";

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
