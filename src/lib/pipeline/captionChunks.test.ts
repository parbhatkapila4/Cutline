import { describe, it, expect } from "vitest";
import {
  CAPTION_MAX_CHUNK_EM,
  CAPTION_MAX_CHUNK_WORDS,
  chunkCaptionText,
} from "./captionChunks";
import { captionTextWidthEm } from "./captionMetrics";
import { captionLineCapacityEm, lineEndWeakness } from "@/remotion/captionLayout";
import { getDimensionsForAspectRatio } from "@/lib/validation/aspectRatio";

const CORPUS = [
  "Your team can finally relax, because emerging threats and zero-day attacks are blocked automatically.",
  "Our analysts watch the dark web for new and emerging threats and flag them before they reach you.",
  "Every day, emerging threats and new attack methods put your business at risk.",
  "Stop guessing what your customers want.",
  "With Cutline, you can turn a single sentence into a polished video in minutes.",
  "It's not just coffee, it's a ritual.",
  "Here's the thing: most teams spend hours on work that a tool could do in seconds.",
  "Imagine waking up to a fully booked calendar, happy clients, and zero admin work.",
  "We built this for the people who are tired of tools that promise everything and deliver nothing.",
  "Skip the line, order ahead, and pick up your latte in under two minutes.",
  "Cloud costs climbing? Our platform finds idle servers, rightsizes them, and saves you up to 40% every month.",
  "Ready to grow? Tap the link and start today!",
  "Dr. Smith and the U.S. team shipped version 2.0 at 9 a.m. on Monday.",
  "Café owners in São Paulo trust Ñandú to manage their naïve résumé backlog.",
];

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean);

describe("chunkCaptionText", () => {
  it("does not strand 'and' at the end of a caption (the 'emerging threats and' bug)", () => {
    expect(chunkCaptionText(CORPUS[0]!)).toEqual([
      "Your team can finally relax,",
      "because emerging threats",
      "and zero-day attacks",
      "are blocked automatically.",
    ]);
  });

  it("keeps every word, in order and unchanged", () => {
    for (const line of CORPUS) {
      expect(chunkCaptionText(line).join(" ")).toBe(words(line).join(" "));
    }
  });

  it("keeps each caption within the width and word caps, so it fits one line at 9:16", () => {
    const portrait = captionLineCapacityEm(getDimensionsForAspectRatio("9:16"));
    for (const line of CORPUS) {
      for (const chunk of chunkCaptionText(line)) {
        expect(words(chunk).length).toBeLessThanOrEqual(CAPTION_MAX_CHUNK_WORDS);
        expect(captionTextWidthEm(chunk)).toBeLessThanOrEqual(CAPTION_MAX_CHUNK_EM);
        expect(captionTextWidthEm(chunk)).toBeLessThan(portrait);
      }
    }
  });

  it("never ends a caption on a word that binds to the next one", () => {
    for (const line of CORPUS) {
      for (const chunk of chunkCaptionText(line)) {
        expect(lineEndWeakness(words(chunk).at(-1)!), `${line} -> [${chunk}]`).toBeLessThan(2);
      }
    }
  });

  it("ends a caption at every sentence end, but not at a title or an initial", () => {
    expect(chunkCaptionText("Ready to grow? Tap the link and start today!")).toEqual([
      "Ready to grow?",
      "Tap the link and start today!",
    ]);
    expect(chunkCaptionText("Fast. Simple. Done.")).toEqual(["Fast.", "Simple.", "Done."]);
    expect(chunkCaptionText("Ask Dr. Smith or J. Doe.")).toEqual(["Ask Dr. Smith or J. Doe."]);
  });

  it("splits by rendered width, so capitals break sooner than lowercase", () => {
    expect(chunkCaptionText("the quick brown fox jumps over")).toEqual(["the quick brown fox jumps over"]);
    expect(chunkCaptionText("THE QUICK BROWN FOX JUMPS OVER")).toEqual([
      "THE QUICK BROWN",
      "FOX JUMPS OVER",
    ]);
  });

  it("gives a word wider than the cap a caption of its own and never splits it", () => {
    const long = "supercalifragilisticexpialidocious.example.com";
    expect(captionTextWidthEm(long)).toBeGreaterThan(CAPTION_MAX_CHUNK_EM);
    expect(chunkCaptionText(`Visit ${long} today.`)).toEqual(["Visit", long, "today."]);
  });

  it("returns nothing for blank text", () => {
    expect(chunkCaptionText("")).toEqual([]);
    expect(chunkCaptionText("   \n ")).toEqual([]);
  });
});
