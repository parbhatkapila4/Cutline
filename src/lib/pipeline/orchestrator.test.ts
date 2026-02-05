import { describe, it, expect } from "vitest";
import { getCaptionsRenderOption } from "./orchestrator";

describe("getCaptionsRenderOption", () => {
  const trackWithChunks = {
    chunks: [
      { text: "Hello", startMs: 0, endMs: 500, shotId: "s1" },
      { text: "World", startMs: 500, endMs: 1000, shotId: "s2" },
    ],
  };

  it("when captions is 'off', returns showCaptions false and empty subtitle track", () => {
    const result = getCaptionsRenderOption("off", trackWithChunks);
    expect(result.showCaptions).toBe(false);
    expect(result.subtitleTrack.chunks).toEqual([]);
  });

  it("when captions is 'on', returns showCaptions true and the refined track", () => {
    const result = getCaptionsRenderOption("on", trackWithChunks);
    expect(result.showCaptions).toBe(true);
    expect(result.subtitleTrack).toBe(trackWithChunks);
    expect(result.subtitleTrack.chunks).toHaveLength(2);
  });

  it("when captions is undefined, returns showCaptions true (default on)", () => {
    const result = getCaptionsRenderOption(undefined, trackWithChunks);
    expect(result.showCaptions).toBe(true);
    expect(result.subtitleTrack.chunks).toHaveLength(2);
  });
});
