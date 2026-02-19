const ALLOW_ANY_ORIGIN = "*";

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
