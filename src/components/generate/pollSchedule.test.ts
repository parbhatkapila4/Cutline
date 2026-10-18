import { describe, it, expect } from "vitest";
import { runningPollDelay } from "./pollSchedule";
import { POLL_MAX_TOTAL_MS } from "./constants";

const MIN = 60_000;

describe("runningPollDelay", () => {
  it("slows down as the job runs", () => {
    expect(runningPollDelay(0)).toBe(2_500);
    expect(runningPollDelay(MIN - 1)).toBe(2_500);
    expect(runningPollDelay(MIN)).toBe(5_000);
    expect(runningPollDelay(3 * MIN)).toBe(10_000);
    expect(runningPollDelay(10 * MIN)).toBe(15_000);
    expect(runningPollDelay(29 * MIN)).toBe(15_000);
  });

  it("stops at the 30 minute cap", () => {
    expect(POLL_MAX_TOTAL_MS).toBe(30 * MIN);
    expect(runningPollDelay(30 * MIN)).toBeNull();
  });

  it("makes about 170 requests for a job that never finishes, not one every 2.5 s forever", () => {
    let requests = 0;
    let elapsed = 0;
    for (;;) {
      requests++;
      const delay = runningPollDelay(elapsed);
      if (delay === null) break;
      elapsed += delay;
    }
    expect(requests).toBe(171);
  });
});
