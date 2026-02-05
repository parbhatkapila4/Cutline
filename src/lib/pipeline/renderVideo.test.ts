import { describe, it, expect } from "vitest";
import { buildRemotionProps, type RenderInput } from "./renderVideo";

const minimalRenderInput = (overrides: Partial<RenderInput> = {}): RenderInput =>
  ({
    script: { entries: [] },
    shotList: { shots: [], totalDurationSeconds: 30 },
    subtitleTrack: { chunks: [] },
    motionSpec: { entries: [] },
    visualSpec: { entries: [] },
    imageSpec: { entries: [] },
    audioBase64: null,
    ...overrides,
  }) as RenderInput;

describe("buildRemotionProps", () => {
  it("sets showCaptions to false when input.showCaptions is false and subtitle track is empty", () => {
    const input = minimalRenderInput({
      showCaptions: false,
      subtitleTrack: { chunks: [] },
    });
    const props = buildRemotionProps(input);
    expect(props.showCaptions).toBe(false);
    expect(props.subtitleTrack).toEqual({ chunks: [] });
  });

  it("sets showCaptions to false when input has empty subtitle track and showCaptions false (captions off)", () => {
    const input = minimalRenderInput({
      showCaptions: false,
      subtitleTrack: { chunks: [] },
    });
    const props = buildRemotionProps(input);
    expect(props.showCaptions).toBe(false);
  });

  it("sets showCaptions to true when input has chunks and showCaptions undefined (default)", () => {
    const input = minimalRenderInput({
      subtitleTrack: {
        chunks: [
          { text: "Hello", startMs: 0, endMs: 500, shotId: "s1" },
        ],
      },
    });
    const props = buildRemotionProps(input);
    expect(props.showCaptions).toBe(true);
  });

  it("sets showCaptions to true when input.showCaptions is true even with empty chunks", () => {
    const input = minimalRenderInput({
      showCaptions: true,
      subtitleTrack: { chunks: [] },
    });
    const props = buildRemotionProps(input);
    expect(props.showCaptions).toBe(true);
  });
});
