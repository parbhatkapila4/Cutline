const MAX_REQUEST_ID_LENGTH = 128;

export function generateRequestId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getRequestIdFromRequest(request: Request): string {
  const header =
    request.headers.get("x-request-id") ?? request.headers.get("x-correlation-id");
  const trimmed = header?.trim() ?? "";
  if (trimmed.length === 0) return generateRequestId();
  if (trimmed.length > MAX_REQUEST_ID_LENGTH) {
    return generateRequestId();
  }
  return trimmed;
}
