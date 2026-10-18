import { POLL_MAX_DELAY_MS, POLL_MAX_TOTAL_MS } from "./constants";

const RUNNING_POLL_STEPS: ReadonlyArray<{ untilMs: number; delayMs: number }> = [
  { untilMs: 60_000, delayMs: 2_500 },
  { untilMs: 3 * 60_000, delayMs: 5_000 },
  { untilMs: 10 * 60_000, delayMs: 10_000 },
];

export function runningPollDelay(elapsedMs: number): number | null {
  if (elapsedMs >= POLL_MAX_TOTAL_MS) return null;
  return RUNNING_POLL_STEPS.find((step) => elapsedMs < step.untilMs)?.delayMs ?? POLL_MAX_DELAY_MS;
}
