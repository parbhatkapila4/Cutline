import { describe, it, expect } from "vitest";
import {
  CAPTION_MAX_WIDTH_OF_WIDTH,
  CAPTION_MIN_SCALE,
  CAPTION_PADDING_X_EM,
  captionFontSizePx,
  captionLineCapacityEm,
  layoutCaption,
  type CaptionFrame,
} from "./captionLayout";
import { captionTextWidthEm } from "@/lib/pipeline/captionMetrics";
import { CAPTION_MAX_CHUNK_EM } from "@/lib/pipeline/captionChunks";
import { ASPECT_RATIOS, getDimensionsForAspectRatio } from "@/lib/validation/aspectRatio";

const measure = (text: string, fontSizePx: number) => captionTextWidthEm(text) * fontSizePx;
const PORTRAIT: CaptionFrame = { width: 1080, height: 1920 };
const LANDSCAPE: CaptionFrame = { width: 1920, height: 1080 };

function pillWidth(text: string, frame: CaptionFrame): number {
  const layout = layoutCaption(text, frame, measure);
  return layout.textWidthPx + 2 * layout.paddingXPx;
}

describe("captionFontSizePx", () => {
  it("is 4.4% of the short side for every output size", () => {
    const sizes = Object.fromEntries(
      ASPECT_RATIOS.map((ratio) => [ratio, captionFontSizePx(getDimensionsForAspectRatio(ratio))])
    );
    expect(sizes).toEqual({ "16:9": 48, "9:16": 48, "1:1": 48, "4:5": 38, "3:2": 48, "21:9": 48 });
    expect(captionFontSizePx({ width: 1280, height: 720 })).toBe(32);
    expect(captionFontSizePx({ width: 720, height: 1280 })).toBe(32);
  });

  it("leaves every format room for a full caption chunk on one line, with a margin", () => {
    for (const ratio of ASPECT_RATIOS) {
      expect(captionLineCapacityEm(getDimensionsForAspectRatio(ratio))).toBeGreaterThanOrEqual(
        CAPTION_MAX_CHUNK_EM * 1.1
      );
    }
  });
});

describe("layoutCaption", () => {
  it("keeps a caption that fits on one line at full size, 15% above the bottom of a 9:16 frame", () => {
    const layout = layoutCaption("because emerging threats", PORTRAIT, measure);
    expect(layout.lines).toEqual(["because emerging threats"]);
    expect(layout.fontSizePx).toBe(48);
    expect(layout.bottomPx).toBe(288);
    expect(layout.paddingXPx).toBe(24);
    expect(layout.radiusPx).toBeCloseTo(14.4);
  });

  it("sits 15% above the bottom on 9:16 and 9% on every other shape", () => {
    const bottomOf = (frame: CaptionFrame) => layoutCaption("because emerging threats", frame, measure).bottomPx;
    const bottoms = Object.fromEntries(
      ASPECT_RATIOS.map((ratio) => [ratio, bottomOf(getDimensionsForAspectRatio(ratio))])
    );
    expect(bottoms).toEqual({ "16:9": 97, "9:16": 288, "1:1": 97, "4:5": 97, "3:2": 97, "21:9": 97 });
    expect(bottomOf({ width: 720, height: 1280 })).toBe(192);
    expect(bottomOf({ width: 1280, height: 720 })).toBe(65);
    expect(bottomOf(getDimensionsForAspectRatio("9:16", 240))).toBe(64);
  });

  it("stacks two balanced lines when one line would not fit", () => {
    const text = "Unlock new levels of productivity across distributed teams";
    const layout = layoutCaption(text, PORTRAIT, measure);
    expect(layout.lines).toHaveLength(2);
    expect(layout.fontSizePx).toBe(48);
    expect(layout.lines.join(" ")).toBe(text);
    const [a, b] = layout.lines.map((l) => measure(l, 48));
    expect(Math.abs(a! - b!)).toBeLessThan(measure("productivity across", 48));
  });

  it("does not end the first of two lines on a word like 'the'", () => {
    const layout = layoutCaption("We rebuilt the onboarding flow for the busiest teams", PORTRAIT, measure);
    expect(layout.lines).toHaveLength(2);
    expect(layout.lines[0]!.split(" ").at(-1)).not.toBe("the");
  });

  it("shrinks a caption that needs more than two lines, down to the minimum scale", () => {
    const text = "Unlock unprecedented productivity across every distributed engineering team";
    const layout = layoutCaption(text, PORTRAIT, measure);
    expect(layout.lines).toHaveLength(2);
    expect(layout.fontSizePx).toBeLessThan(48);
    expect(layout.fontSizePx).toBeGreaterThanOrEqual(48 * CAPTION_MIN_SCALE);
  });

  it("past two lines at the minimum scale, wraps further instead of leaving the frame", () => {
    const text =
      "Your team can finally relax, because emerging threats and zero-day attacks are blocked automatically, every hour of every day.";
    const layout = layoutCaption(text, PORTRAIT, measure);
    expect(layout.lines.length).toBeGreaterThan(2);
    expect(layout.fontSizePx).toBeCloseTo(48 * CAPTION_MIN_SCALE);
    expect(layout.lines.join(" ")).toBe(text);
  });

  it("breaks a single word wider than the frame inside the word, keeping every letter", () => {
    const word = "x".repeat(140);
    const layout = layoutCaption(word, PORTRAIT, measure);
    expect(layout.lines.length).toBeGreaterThan(1);
    expect(layout.lines.join("")).toBe(word);
  });

  it("shrinks a long single word onto one line when the minimum scale is enough", () => {
    const layout = layoutCaption("supercalifragilisticexpialidocious.example.com", PORTRAIT, measure);
    expect(layout.lines).toHaveLength(1);
    expect(layout.fontSizePx).toBeLessThan(48);
  });

  it("never draws a pill wider than the frame allows", () => {
    const texts = [
      "a",
      "because emerging threats",
      "WORLDWIDE WOMEN'S MOMENTUM MEMBERSHIP AND EVERYTHING AFTER IT",
      "supercalifragilisticexpialidocious.example.com",
      "x".repeat(300),
      "Your team can finally relax, because emerging threats and zero-day attacks are blocked automatically, every hour of every day.",
    ];
    for (const frame of [PORTRAIT, LANDSCAPE, { width: 864, height: 1080 }, { width: 1280, height: 720 }]) {
      for (const text of texts) {
        expect(pillWidth(text, frame)).toBeLessThanOrEqual(frame.width * CAPTION_MAX_WIDTH_OF_WIDTH + 1);
      }
    }
  });

  it("returns no lines for empty text", () => {
    expect(layoutCaption("  ", PORTRAIT, measure).lines).toEqual([]);
  });

  it("sizes the pill to the words, not the frame", () => {
    const short = pillWidth("Try it today!", PORTRAIT);
    const long = pillWidth("Try it free for fourteen days", PORTRAIT);
    expect(short).toBeLessThan(long);
    expect(short).toBeCloseTo(measure("Try it today!", 48) + 2 * CAPTION_PADDING_X_EM * 48);
  });
});
