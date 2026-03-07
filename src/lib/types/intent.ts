export type IntentAudience = "broad" | "technical" | "casual";
export type IntentGoal = "explain" | "persuade" | "entertain";
export type IntentTone = "serious" | "playful" | "urgent";
export type IntentComplexity = "simple" | "multi-part";

export interface Intent {
  audience: IntentAudience;
  goal: IntentGoal;
  tone: IntentTone;
  complexity: IntentComplexity;
  durationSeconds: number;
  rawInput: string;
  mainSubject?: string | null;
}

export const INTENT_DURATION_MIN = 30;
export const INTENT_DURATION_MAX = 45;
