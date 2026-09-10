import { describe, it, expect } from "vitest";
import { purchasedGenerativeWork } from "./videoQueue";


describe("release classifier", () => {
  it("releases when no stage ever started", () => {
    expect(purchasedGenerativeWork(0)).toBe(false);
    expect(purchasedGenerativeWork(undefined)).toBe(false);
    expect(purchasedGenerativeWork(null)).toBe(false);
  });

  it("releases for every stage before a generator is reached", () => {
    for (const stage of [
      "intent",
      "narrative",
      "shots",
      "script",
      "tts",
      "subtitles",
      "asset_analysis",
      "image_sourcing",
      "render",
    ]) {
      expect(purchasedGenerativeWork({ stage, startedAt: "x" })).toBe(false);
    }
  });

  it("releases inside the veo stage until the first chunk is requested", () => {
    expect(purchasedGenerativeWork({ stage: "veo", startedAt: "x" })).toBe(false);
  });

  it("does NOT release once a Veo chunk has been requested", () => {
    expect(purchasedGenerativeWork({ stage: "veo", detail: "chunk 1 of 8", startedAt: "x" })).toBe(true);
    expect(purchasedGenerativeWork({ stage: "veo", detail: "chunk 7 of 8", startedAt: "x" })).toBe(true);
  });

  it("releases inside the heygen stage until generation is requested", () => {
    expect(purchasedGenerativeWork({ stage: "heygen", startedAt: "x" })).toBe(false);
    expect(purchasedGenerativeWork({ stage: "heygen", detail: "uploading", startedAt: "x" })).toBe(false);
  });

  it("does NOT release once HeyGen generation has been requested", () => {
    expect(purchasedGenerativeWork({ stage: "heygen", detail: "generating", startedAt: "x" })).toBe(true);
  });

  it("treats a malformed progress payload as 'nothing bought'", () => {
    expect(purchasedGenerativeWork("veo")).toBe(false);
    expect(purchasedGenerativeWork([{ stage: "veo" }])).toBe(false);
    expect(purchasedGenerativeWork({ stage: 42, detail: 7 })).toBe(false);
  });
});
