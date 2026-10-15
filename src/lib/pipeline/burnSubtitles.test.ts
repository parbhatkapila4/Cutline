import { describe, it, expect } from "vitest";
import { buildAssDocument, splitIntoDisplayCaptions } from "./burnSubtitles";

const PHRASE =
  "Your team can finally relax, because emerging threats and zero-day attacks are blocked automatically.";

function dialogues(doc: string, style: string): string[] {
  return doc.split("\n").filter((l) => l.startsWith("Dialogue:") && l.split(",")[3] === style);
}

describe("splitIntoDisplayCaptions", () => {
  it("splits a long phrase into caption chunks and divides its window evenly", () => {
    const captions = splitIntoDisplayCaptions([{ text: PHRASE, startMs: 2000, endMs: 6000 }]);
    expect(captions).toEqual([
      { text: "Your team can finally relax,", startMs: 2000, endMs: 3000 },
      { text: "because emerging threats", startMs: 3000, endMs: 4000 },
      { text: "and zero-day attacks", startMs: 4000, endMs: 5000 },
      { text: "are blocked automatically.", startMs: 5000, endMs: 6000 },
    ]);
  });

  it("keeps each piece at least 400 ms by merging neighbours when the window is short", () => {
    const captions = splitIntoDisplayCaptions([{ text: PHRASE, startMs: 0, endMs: 900 }]);
    expect(captions).toHaveLength(2);
    expect(captions.map((c) => c.text).join(" ")).toBe(PHRASE);
    expect(captions[0]!.endMs).toBe(captions[1]!.startMs);
    expect(captions[1]!.endMs).toBe(900);
  });
});

describe("buildAssDocument", () => {
  const doc = buildAssDocument([{ text: PHRASE, startMs: 0, endMs: 4000 }], { width: 1080, height: 1920 });

  it("keeps the font family and turns off the old outline and word wrapping", () => {
    expect(doc).toContain("WrapStyle: 2");
    expect(doc).toContain("PlayResX: 1080");
    expect(doc).toMatch(/^Style: Caption,Arial,[\d.]+,&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,0,0,8,/m);
    expect(doc).toMatch(/^Style: Pill,Arial,[\d.]+,&H4D000000,/m);
  });

  it.each([
    { shape: "9:16", frame: { width: 1080, height: 1920 }, bottom: 288 },
    { shape: "9:16 at 720p", frame: { width: 720, height: 1280 }, bottom: 192 },
    { shape: "16:9", frame: { width: 1920, height: 1080 }, bottom: 97 },
    { shape: "4:5", frame: { width: 864, height: 1080 }, bottom: 97 },
  ])("draws one rounded pill per caption on $shape, centered, with its bottom $bottom px up", ({ frame, bottom }) => {
    const pills = dialogues(buildAssDocument([{ text: PHRASE, startMs: 0, endMs: 4000 }], frame), "Pill");
    expect(pills).toHaveLength(4);
    for (const pill of pills) {
      const pos = /\\pos\((\d+),(\d+)\)\\p1\}m (\d+) 0 l (\d+) 0 .* l (\d+) (\d+)/.exec(pill);
      expect(pos).not.toBeNull();
      const left = Number(pos![1]);
      const top = Number(pos![2]);
      const path = pill.slice(pill.indexOf("}m ") + 1, pill.indexOf("{\\p0}"));
      const xs = path.split(" ").filter((t) => /^\d+$/.test(t)).map(Number).filter((_, i) => i % 2 === 0);
      const ys = path.split(" ").filter((t) => /^\d+$/.test(t)).map(Number).filter((_, i) => i % 2 === 1);
      const width = Math.max(...xs);
      const height = Math.max(...ys);
      expect(Math.abs(left + width / 2 - frame.width / 2)).toBeLessThanOrEqual(1);
      expect(top + height).toBe(frame.height - bottom);
      expect(path).toContain(" b ");
    }
  });

  it("puts each caption's text on top of its pill, for the same time window", () => {
    const pills = dialogues(doc, "Pill");
    const texts = dialogues(doc, "Caption");
    expect(texts).toHaveLength(4);
    texts.forEach((text, i) => {
      const [, start, end] = pills[i]!.split(",");
      expect(text.split(",").slice(1, 3)).toEqual([start, end]);
      expect(text.startsWith("Dialogue: 1,")).toBe(true);
    });
    expect(texts[1]).toMatch(/\\pos\(540,[\d.]+\)\\fs[\d.]+\}because emerging threats$/);
  });

  it("stacks two text lines inside one pill when a caption needs them", () => {
    const twoLine = buildAssDocument(
      [{ text: "Unlock new levels of productivity across distributed teams", startMs: 0, endMs: 600 }],
      { width: 1080, height: 1920 }
    );
    const texts = dialogues(twoLine, "Caption");
    expect(dialogues(twoLine, "Pill")).toHaveLength(1);
    expect(texts).toHaveLength(2);
    const ys = texts.map((t) => Number(/\\pos\(540,([\d.]+)\)/.exec(t)![1]));
    expect(ys[1]! - ys[0]!).toBeCloseTo(48 * 1.2, 1);
  });

  it("still rejects a track with no usable entries", () => {
    expect(() => buildAssDocument([{ text: "hi", startMs: 0, endMs: 100 }], { width: 1080, height: 1920 })).toThrow(
      /No valid subtitle entries/
    );
  });
});
