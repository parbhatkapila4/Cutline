/**
 * CORS configuration for generate and related API routes.
 * Used only for /api/generate, /api/generate/[jobId], cancel, and download.
 * Admin and telemetry routes are not included; they remain same-origin.
 *
 * When Origin is missing (same-origin or non-browser clients like curl):
 * we do not set Access-Control-Allow-Origin, so the response is treated as
 * same-origin and is readable by the caller. No CORS headers are needed.
 *
 * Optional: Access-Control-Expose-Headers can be set so clients can read
 * X-Request-ID from responses; currently we do not expose it (browsers only
 * expose simple response headers by default). Add "X-Request-ID" to
 * Access-Control-Expose-Headers in getCorsHeaders if needed.
 */

const ALLOW_ANY_ORIGIN = "*";

/**
 * Returns the list of allowed origins from environment.
 * - CORS_ORIGIN (single value) or CORS_ORIGINS (comma-separated).
 * - If value is exactly "*" or "*" is in the list, returns ["*"].
 * - If unset or empty, returns [] (no CORS headers will be set).
 * - Empty strings are filtered out.
 */
export function getAllowedOrigins(): string[] {
  const single = process.env.CORS_ORIGIN?.trim();
  const multi = process.env.CORS_ORIGINS?.trim();
  const raw = single
    ? [single]
    : multi
      ? multi.split(",").map((s) => s.trim())
      : [];
  const list = raw.filter(Boolean);
  if (list.length === 0) return [];
  if (list.some((o) => o === ALLOW_ANY_ORIGIN)) return [ALLOW_ANY_ORIGIN];
  return list;
}

/**
 * Returns CORS headers to add to the response.
 * - If no origins are configured: returns {} (no CORS).
 * - If origin is null (no Origin header, e.g. same-origin or curl): returns {}.
 *   We do not set Allow-Origin so the response is not treated as CORS; same-origin
 *   requests can read the body without CORS headers.
 * - If origin is in the allowed list (or list is ["*"]): returns
 *   Access-Control-Allow-Origin, Allow-Methods, Allow-Headers, Max-Age.
 * - If origin is not in the list: returns {} (browser will block the response
 *   for that cross-origin request; we do not echo back a disallowed origin).
 */
export function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowed = getAllowedOrigins();
  if (allowed.length === 0) return {};
  if (origin == null || origin === "") return {};

  const allowAny = allowed[0] === ALLOW_ANY_ORIGIN;
  if (!allowAny && !allowed.includes(origin)) return {};

  return {
    "Access-Control-Allow-Origin": allowAny ? ALLOW_ANY_ORIGIN : origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Request-ID, X-Admin-Secret",
    "Access-Control-Max-Age": "86400",
  };
}
