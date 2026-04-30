import type { Intent } from "@/lib/types/intent";
import type { NarrativePlan } from "@/lib/types/narrative";
import type { ShotList } from "@/lib/types/shots";
import type { Script } from "@/lib/types/script";
import type { MotionSpec } from "@/lib/types/motion";
import type { VisualSpec } from "@/lib/types/visuals";
import type { ImageSpec } from "@/lib/images/types";

export type BrandBrainInput = {
  bannedPhrases?: string[];
  requiredPhrases?: string[];
  voiceTone?: string;
  motionStyle?: "default" | "subtle" | "dynamic";
};

export type ScriptFidelityMode = "creative" | "strict";

export type QualityReport = {
  passed: boolean;
  score: number;
  issues: string[];
};

export type RegenSnapshotV1 = {
  version: 1;
  sourceJobId: string;
  intent: Intent;
  narrative: NarrativePlan;
  shotList: ShotList;
  script: Script;
  motionSpec: MotionSpec;
  visualSpec: VisualSpec;
  imageSpec: ImageSpec;
  captions: "on" | "off";
  aspectRatio?: string;
  platform?: string;
  logoUrl?: string;
  logoPlacement?: "outro" | "watermark" | "hero";
};
