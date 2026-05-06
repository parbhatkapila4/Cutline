export const ASPECT_RATIOS = [
  "16:9",
  "9:16",
  "1:1",
  "4:5",
  "3:2",
  "21:9",
] as const;

export type AspectRatio = (typeof ASPECT_RATIOS)[number];

const DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
  "16:9": { width: 1920, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
  "4:5": { width: 864, height: 1080 },
  "3:2": { width: 1620, height: 1080 },
  "21:9": { width: 2520, height: 1080 },
};

export function getDimensionsForAspectRatio(
  ratio: AspectRatio
): { width: number; height: number } {
  return DIMENSIONS[ratio];
}

export function isValidAspectRatio(value: unknown): value is AspectRatio {
  return typeof value === "string" && ASPECT_RATIOS.includes(value as AspectRatio);
}
