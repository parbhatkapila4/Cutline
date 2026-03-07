export type MotionType =
  | "static"
  | "push"
  | "pull"
  | "pan-left"
  | "pan-right"
  | "zoom-in"
  | "zoom-out"
  | "cut";

export interface MotionParams {
  startScale?: number;
  endScale?: number;
  startX?: number;
  endX?: number;
  startY?: number;
  endY?: number;
  easing?: "linear" | "ease-in" | "ease-out";
}

export interface MotionSpecEntry {
  shotId: string;
  motionType: MotionType;
  durationSeconds: number;
  params: MotionParams;
  order: number;
}

export interface MotionSpec {
  entries: MotionSpecEntry[];
}
