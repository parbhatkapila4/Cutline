import { describe, it, expect } from "vitest";
import { kenBurnsTransform, type KenBurnsTransform } from "./kenBurns";
import { composeMotion } from "@/lib/pipeline/motion";
import type { Shot, ShotList } from "@/lib/types";

const MOTIONS: Shot["motionType"][] = ["static", "push", "pull", "pan-left", "pan-right", "zoom-in", "zoom-out", "cut"];

function motionEntries(motionStyle: "default" | "subtle" | "dynamic") {
  const shotList: ShotList = {
    shots: MOTIONS.map((motionType, order) => ({
      id: `s${order}`,
      beatId: "b",
      durationSeconds: 3,
      purpose: "establish",
      motionType,
      emotionalIntent: "neutral",
      textDensity: 1,
      order,
    })),
    totalDurationSeconds: 3 * MOTIONS.length,
  };
  return composeMotion(shotList, { motionStyle }).entries;
}
function coversFrame({ scale, translateX, translateY }: KenBurnsTransform) {
  return [translateX, translateY].every((t) => scale / 2 - scale * Math.abs(t / 100) >= 0.5 - 1e-9);
}

describe("kenBurnsTransform", () => {
  it.each(["default", "subtle", "dynamic"] as const)(
    "keeps the frame covered through every %s motion",
    (style) => {
      for (const entry of motionEntries(style)) {
        for (let step = 0; step <= 20; step++) {
          const transform = kenBurnsTransform(entry.motionType, { ...entry.params }, step / 20);
          expect(coversFrame(transform), `${style} ${entry.motionType} at ${step * 5}%`).toBe(true);
        }
      }
    }
  );

  it("moves pans and zooms from start to end", () => {
    expect(kenBurnsTransform("pan-left", { startX: 0, endX: -5 }, 1).translateX).toBe(-5);
    expect(kenBurnsTransform("pan-right", { startX: 0, endX: 5 }, 0.5).translateX).toBe(2.5);
    expect(kenBurnsTransform("zoom-in", { startScale: 1, endScale: 1.25 }, 1).scale).toBe(1.25);
  });

  it("zooms a 5% pan to 1/0.9 for its whole length and leaves other motion alone", () => {
    for (const progress of [0, 0.5, 1]) {
      expect(kenBurnsTransform("pan-left", { startX: 0, endX: -5 }, progress).scale).toBeCloseTo(1 / 0.9, 9);
    }
    expect(kenBurnsTransform("zoom-out", { startScale: 1.15, endScale: 1 }, 1).scale).toBe(1);
    expect(kenBurnsTransform("static", {}, 0.5)).toEqual({ scale: 1, translateX: 0, translateY: 0 });
  });
});
