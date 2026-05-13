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
  "16:9": { width: 3840, height: 2160 },
  "9:16": { width: 2160, height: 3840 },
  "1:1": { width: 2160, height: 2160 },
  "4:5": { width: 1728, height: 2160 },
  "3:2": { width: 3240, height: 2160 },
  "21:9": { width: 5040, height: 2160 },
};

export function getDimensionsForAspectRatio(
  ratio: AspectRatio
): { width: number; height: number } {
  return DIMENSIONS[ratio];
}

export function isValidAspectRatio(value: unknown): value is AspectRatio {
  return typeof value === "string" && ASPECT_RATIOS.includes(value as AspectRatio);
}
