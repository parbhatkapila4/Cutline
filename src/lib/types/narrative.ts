export type BeatPacing = "fast" | "slow" | "steady";

export interface NarrativeBeat {
  id: string;
  purpose: string;
  durationSeconds: number;
  pacing: BeatPacing;
}

export interface NarrativePlan {
  arc: string;
  beats: NarrativeBeat[];
  totalDurationSeconds: number;
  rationale: string;
}
