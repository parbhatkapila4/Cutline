const DEFAULT_MAX_DURATION_SECONDS = 300;
const MIN_DURATION_SECONDS = 1;
const ABSOLUTE_MAX_DURATION_SECONDS = 3600;

export function getMaxDurationSeconds(): number {
  const raw = process.env.MAX_VIDEO_DURATION_SECONDS;
  if (raw == null || raw === "") return DEFAULT_MAX_DURATION_SECONDS;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return DEFAULT_MAX_DURATION_SECONDS;
  return Math.max(MIN_DURATION_SECONDS, Math.min(ABSOLUTE_MAX_DURATION_SECONDS, n));
}

export function getMaxOutputMb(): number | undefined {
  const raw = process.env.MAX_VIDEO_OUTPUT_MB;
  if (raw == null || raw === "") return undefined;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
}
