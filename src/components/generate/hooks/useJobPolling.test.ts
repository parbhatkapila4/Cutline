import { describe, expect, it } from "vitest";
import { getNextPollDelay, hasPollingTimedOut } from "./useJobPolling";

describe("useJobPolling helpers", () => {
  it("backs off polling delay exponentially", () => {
    expect(getNextPollDelay(2000)).toBe(4000);
    expect(getNextPollDelay(4000)).toBe(8000);
  });

  it("caps polling delay at max limit", () => {
    expect(getNextPollDelay(10_000)).toBe(15_000);
    expect(getNextPollDelay(15_000)).toBe(15_000);
  });

  it("times out only when max total window reached", () => {
    const start = 1_000;
    expect(hasPollingTimedOut(start, start + 1_799_999)).toBe(false);
    expect(hasPollingTimedOut(start, start + 1_800_000)).toBe(true);
  });
});
