export type KenBurnsTransform = {
  scale: number;
  translateX: number;
  translateY: number;
};

const num = (value: unknown, fallback: number) =>
  typeof value === "number" ? value : fallback;

const lerp = (start: number, end: number, progress: number) =>
  start + (end - start) * progress;

export function kenBurnsTransform(
  motionType: string,
  params: Record<string, unknown>,
  progress: number
): KenBurnsTransform {
  let scale = 1;
  let shiftX: [number, number] = [0, 0];
  let shiftY: [number, number] = [0, 0];

  if (
    motionType === "push" ||
    motionType === "pull" ||
    motionType === "zoom-in" ||
    motionType === "zoom-out"
  ) {
    scale = lerp(num(params.startScale, 1), num(params.endScale, 1), progress);
  }
  if (motionType === "pan-left" || motionType === "pan-right") {
    shiftX = [num(params.startX, 0), num(params.endX, 0)];
  }
  if (params.startY !== undefined && params.endY !== undefined) {
    shiftY = [num(params.startY, 0), num(params.endY, 0)];
  }
  const widest = Math.min(0.25, Math.max(...[...shiftX, ...shiftY].map(Math.abs)) / 100);

  return {
    scale: Math.max(scale, 1 / (1 - 2 * widest)),
    translateX: lerp(shiftX[0], shiftX[1], progress),
    translateY: lerp(shiftY[0], shiftY[1], progress),
  };
}
