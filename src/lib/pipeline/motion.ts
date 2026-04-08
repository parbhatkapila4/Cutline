import type { ShotList } from "@/lib/types";
import type {
  MotionParams,
  MotionSpec,
  MotionSpecEntry,
  MotionType,
} from "@/lib/types/motion";

const DEFAULT_PARAMS: Record<MotionType, MotionParams> = {
  static: {},
  cut: {},
  push: { startScale: 1, endScale: 1.15, easing: "linear" },
  pull: { startScale: 1.1, endScale: 1, easing: "linear" },
  "pan-left": { startX: 0, endX: -5, easing: "linear" },
  "pan-right": { startX: 0, endX: 5, easing: "linear" },
  "zoom-in": { startScale: 1, endScale: 1.25, easing: "linear" },
  "zoom-out": { startScale: 1.15, endScale: 1, easing: "linear" },
};

const VALID_MOTION_TYPES: MotionType[] = [
  "static",
  "push",
  "pull",
  "pan-left",
  "pan-right",
  "zoom-in",
  "zoom-out",
  "cut",
];

function isMotionType(s: string): s is MotionType {
  return (VALID_MOTION_TYPES as readonly string[]).includes(s);
}

function scaleMotionParams(
  motionType: MotionType,
  params: MotionParams,
  factor: number
): MotionParams {
  if (factor === 1) return params;
  const p = { ...params };
  const scale = (n: number | undefined) =>
    n === undefined ? undefined : 1 + (n - 1) * factor;
  if (motionType === "push" || motionType === "pull" || motionType === "zoom-in" || motionType === "zoom-out") {
    if (p.startScale !== undefined) p.startScale = scale(p.startScale);
    if (p.endScale !== undefined) p.endScale = scale(p.endScale);
  }
  if (motionType === "pan-left" || motionType === "pan-right") {
    if (p.startX !== undefined) p.startX = scale(p.startX);
    if (p.endX !== undefined) p.endX = scale(p.endX);
  }
  return p;
}

export function composeMotion(
  shotList: ShotList,
  options?: { motionStyle?: "default" | "subtle" | "dynamic" }
): MotionSpec {
  const style = options?.motionStyle ?? "default";
  const factor = style === "subtle" ? 0.55 : style === "dynamic" ? 1.25 : 1;
  const shots = [...shotList.shots].sort((a, b) => a.order - b.order);
  const entries: MotionSpecEntry[] = shots.map((shot) => {
    if (!isMotionType(shot.motionType)) {
      throw new Error(
        `Invalid motionType "${shot.motionType}" for shot ${shot.id}. Expected one of: ${VALID_MOTION_TYPES.join(", ")}`
      );
    }
    const base = { ...DEFAULT_PARAMS[shot.motionType] };
    const params =
      shot.motionType === "static" || shot.motionType === "cut" || factor === 1
        ? base
        : scaleMotionParams(shot.motionType, base, factor);
    return {
      shotId: shot.id,
      motionType: shot.motionType,
      durationSeconds: shot.durationSeconds,
      params,
      order: shot.order,
    };
  });
  return { entries };
}
