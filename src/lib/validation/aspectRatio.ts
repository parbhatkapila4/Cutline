export const ASPECT_RATIOS = [
  "16:9",
  "9:16",
  "1:1",
  "4:5",
  "3:2",
  "21:9",
] as const;

export type AspectRatio = (typeof ASPECT_RATIOS)[number];

export const BASE_RENDER_HEIGHT = 1080;
const MIN_RENDER_HEIGHT = 240;
const MAX_RENDER_HEIGHT = 4320;
const BASE_DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
  "16:9": { width: 1920, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
  "4:5": { width: 864, height: 1080 },
  "3:2": { width: 1620, height: 1080 },
  "21:9": { width: 2520, height: 1080 },
};
export function getRenderMaxHeight(): number {
  const raw = process.env.RENDER_MAX_HEIGHT;
  if (raw == null || raw === "") return BASE_RENDER_HEIGHT;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return BASE_RENDER_HEIGHT;
  return Math.max(MIN_RENDER_HEIGHT, Math.min(MAX_RENDER_HEIGHT, n));
}
function toEven(n: number): number {
  return Math.max(2, Math.round(n / 2) * 2);
}

export function getDimensionsForAspectRatio(
  ratio: AspectRatio,
  maxHeight: number = getRenderMaxHeight()
): { width: number; height: number } {
  const base = BASE_DIMENSIONS[ratio];
  const scale = maxHeight / BASE_RENDER_HEIGHT;
  return {
    width: toEven(base.width * scale),
    height: toEven(base.height * scale),
  };
}

export function isValidAspectRatio(value: unknown): value is AspectRatio {
  return typeof value === "string" && ASPECT_RATIOS.includes(value as AspectRatio);
}
