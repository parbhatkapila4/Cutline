export const VIDEO_USAGE_EVENT_TYPES = [
  "download",
  "share_copied",
  "play_started",
] as const;
export type VideoUsageEventType = (typeof VIDEO_USAGE_EVENT_TYPES)[number];
export const CLIENT_VIDEO_USAGE_EVENT_TYPES = [
  "share_copied",
  "play_started",
] as const;
export type ClientVideoUsageEventType =
  (typeof CLIENT_VIDEO_USAGE_EVENT_TYPES)[number];
export const VIDEO_USAGE_SURFACES = [
  "dashboard",
  "video_page",
  "create_page",
] as const;
export type VideoUsageSurface = (typeof VIDEO_USAGE_SURFACES)[number];

function isOneOf<T extends string>(
  allowed: readonly T[],
  value: unknown,
): value is T {
  return (
    typeof value === "string" && (allowed as readonly string[]).includes(value)
  );
}

export function isVideoUsageEventType(
  value: unknown,
): value is VideoUsageEventType {
  return isOneOf(VIDEO_USAGE_EVENT_TYPES, value);
}

export function isClientVideoUsageEventType(
  value: unknown,
): value is ClientVideoUsageEventType {
  return isOneOf(CLIENT_VIDEO_USAGE_EVENT_TYPES, value);
}

export function isVideoUsageSurface(
  value: unknown,
): value is VideoUsageSurface {
  return isOneOf(VIDEO_USAGE_SURFACES, value);
}

export function reportVideoUsage(
  jobId: string | null | undefined,
  eventType: ClientVideoUsageEventType,
  surface: VideoUsageSurface,
): void {
  if (!jobId) return;
  try {
    void fetch(`/api/videos/${encodeURIComponent(jobId)}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType, surface }),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}
