export type ShotPurpose =
  | "establish"
  | "reveal"
  | "emphasize"
  | "transition"
  | "hold";

export type MotionType =
  | "static"
  | "push"
  | "pull"
  | "pan-left"
  | "pan-right"
  | "zoom-in"
  | "zoom-out"
  | "cut";

export type EmotionalIntent =
  | "tension"
  | "release"
  | "curiosity"
  | "urgency"
  | "calm"
  | "neutral";

export type TextDensity = 0 | 1 | 2 | 3;

export interface Shot {
  id: string;
  beatId: string;
  durationSeconds: number;
  purpose: ShotPurpose;
  motionType: MotionType;
  emotionalIntent: EmotionalIntent;
  textDensity: TextDensity;
  order: number;
}

export interface ShotList {
  shots: Shot[];
  totalDurationSeconds: number;
}
