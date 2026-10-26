import { describe, it, expect } from "vitest";
import {
  ASPECT_RATIOS,
  VEO_ASPECT_RATIOS,
  getDimensionsForAspectRatio,
  previewDimensionsForAspectRatio,
  veoAspectRatioFor,
} from "./aspectRatio";
import { layoutCaption } from "@/remotion/captionLayout";

describe("veoAspectRatioFor", () => {
  it("only ever answers with a shape Veo makes", () => {
    for (const ratio of ASPECT_RATIOS) {
      expect(VEO_ASPECT_RATIOS).toContain(veoAspectRatioFor(ratio));
    }
  });

  it("keeps 16:9 and 9:16 as asked", () => {
    expect(veoAspectRatioFor("16:9")).toBe("16:9");
    expect(veoAspectRatioFor("9:16")).toBe("9:16");
  });

  it("turns the other portrait shape, 4:5, into 9:16 and everything else into 16:9", () => {
    expect(veoAspectRatioFor("4:5")).toBe("9:16");
    expect(veoAspectRatioFor("1:1")).toBe("16:9");
    expect(veoAspectRatioFor("3:2")).toBe("16:9");
    expect(veoAspectRatioFor("21:9")).toBe("16:9");
  });

  it("answers 16:9 when nothing usable was asked for", () => {
    expect(veoAspectRatioFor(undefined)).toBe("16:9");
    expect(veoAspectRatioFor("banana")).toBe("16:9");
  });
});

describe("previewDimensionsForAspectRatio", () => {
  const frame = ({ width, height }: { width: number; height: number }) => `${width}x${height}`;

  it("renders every shape with 720 on its short side", () => {
    expect(
      Object.fromEntries(ASPECT_RATIOS.map((r) => [r, frame(previewDimensionsForAspectRatio(r))]))
    ).toEqual({
      "16:9": "1280x720",
      "9:16": "720x1280",
      "1:1": "720x720",
      "4:5": "576x720",
      "3:2": "1080x720",
      "21:9": "1680x720",
    });
  });

  it("falls back to 1280x720 when no usable shape was asked for", () => {
    expect(frame(previewDimensionsForAspectRatio(undefined))).toBe("1280x720");
    expect(frame(previewDimensionsForAspectRatio("banana"))).toBe("1280x720");
  });

  it("is the same shape as the final render for every ratio", () => {
    for (const ratio of ASPECT_RATIOS) {
      const preview = previewDimensionsForAspectRatio(ratio);
      const final = getDimensionsForAspectRatio(ratio);
      expect(preview.width / preview.height).toBeCloseTo(final.width / final.height, 3);
    }
  });

  it("puts the caption at the same share of the frame as the final render, for every ratio", () => {
    const measure = (text: string, fontSizePx: number) => text.length * fontSizePx * 0.5;
    const bottomShare = (f: { width: number; height: number }) =>
      layoutCaption("Ground fresh every morning.", f, measure).bottomPx / f.height;

    for (const ratio of ASPECT_RATIOS) {
      const preview = bottomShare(previewDimensionsForAspectRatio(ratio));
      const final = bottomShare(getDimensionsForAspectRatio(ratio));
      expect(Math.abs(preview - final)).toBeLessThan(0.005);
    }
  });

  it("keeps a 9:16 preview's caption 15% up, where a 1280x720 preview put it 9% up", () => {
    const measure = (text: string, fontSizePx: number) => text.length * fontSizePx * 0.5;
    const caption = (f: { width: number; height: number }) =>
      layoutCaption("Ground fresh every morning.", f, measure).bottomPx / f.height;

    expect(caption(previewDimensionsForAspectRatio("9:16"))).toBeCloseTo(0.15, 2);
    expect(caption({ width: 1280, height: 720 })).toBeCloseTo(0.09, 2);
  });
});
