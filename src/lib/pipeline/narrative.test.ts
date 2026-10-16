import { describe, it, expect } from "vitest";
import { buildSystemPrompt, getBeatCountRange } from "./narrative";

describe("getBeatCountRange", () => {
  it("gives a 10 or 11 s video three beats, since each beat needs a shot with time for a line", () => {
    expect(getBeatCountRange(10)).toEqual({ min: 3, max: 3 });
    expect(getBeatCountRange(11)).toEqual({ min: 3, max: 3 });
    expect(buildSystemPrompt(10)).toContain("beats: array of exactly 3 objects");
  });

  it("leaves longer videos their range", () => {
    expect(getBeatCountRange(12)).toEqual({ min: 3, max: 4 });
    expect(getBeatCountRange(15)).toEqual({ min: 3, max: 4 });
    expect(getBeatCountRange(30)).toEqual({ min: 4, max: 8 });
    expect(getBeatCountRange(60)).toEqual({ min: 6, max: 12 });
  });
});
