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

export function composeMotion(shotList: ShotList): MotionSpec {
  const shots = [...shotList.shots].sort((a, b) => a.order - b.order);
  const entries: MotionSpecEntry[] = shots.map((shot) => {
    if (!isMotionType(shot.motionType)) {
      throw new Error(
        `Invalid motionType "${shot.motionType}" for shot ${shot.id}. Expected one of: ${VALID_MOTION_TYPES.join(", ")}`
      );
    }
    const params = { ...DEFAULT_PARAMS[shot.motionType] };
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
