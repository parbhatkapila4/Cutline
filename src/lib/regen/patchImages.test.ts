import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RegenSnapshotV1 } from "@/lib/types/pipelineEnhancements";

const { mockSourceImageForShot, mockAssertFloor } = vi.hoisted(() => ({
  mockSourceImageForShot: vi.fn(),
  mockAssertFloor: vi.fn(async () => { }),
}));

vi.mock("@/lib/images/source", () => ({
  sourceImageForShot: mockSourceImageForShot,
  normalizeImageSpecForRender: (spec: unknown) => spec,
  assertPlaceholderFloor: mockAssertFloor,
}));

import { buildImageSpecForRegen } from "@/lib/regen/patchImages";

const snap = () =>
  ({
    sourceJobId: "job1",
    imageSpec: {
      entries: [
        { shotId: "s1", imageUrl: "/temp/job1/images/shot-s1.png", source: "unsplash", fallbackUsed: false },
      ],
    },
    shotList: { shots: [{ id: "s1", order: 0 }] },
    script: {},
    intent: {},
  }) as unknown as RegenSnapshotV1;

beforeEach(() => {
  mockSourceImageForShot.mockReset();
  mockSourceImageForShot.mockResolvedValue({
    url: "/temp/job2/images/shot-s1.png",
    source: "unsplash",
    fallbackUsed: false,
  });
  mockAssertFloor.mockReset();
  mockAssertFloor.mockResolvedValue(undefined);
});
const STOCK_ONLY_ARG = 4;

describe("buildImageSpecForRegen - stock-only is honoured (Free must not call DALL-E)", () => {
  it("passes stockOnly=true to sourceImageForShot for a free regen", async () => {
    await buildImageSpecForRegen(snap(), "job2", ["s1"], true);
    expect(mockSourceImageForShot).toHaveBeenCalledTimes(1);
    expect(mockSourceImageForShot.mock.calls[0][STOCK_ONLY_ARG]).toBe(true);
  });

  it("passes stockOnly=false for a paid regen", async () => {
    await buildImageSpecForRegen(snap(), "job2", ["s1"], false);
    expect(mockSourceImageForShot.mock.calls[0][STOCK_ONLY_ARG]).toBe(false);
  });

  it("defaults stockOnly to false when omitted", async () => {
    await buildImageSpecForRegen(snap(), "job2", ["s1"]);
    expect(mockSourceImageForShot.mock.calls[0][STOCK_ONLY_ARG]).toBe(false);
  });
});

describe("buildImageSpecForRegen - the placeholder floor applies", () => {
  it("enforces the floor, relaxing the cap to 1 for a free regen", async () => {
    await buildImageSpecForRegen(snap(), "job2", ["s1"], true);
    expect(mockAssertFloor).toHaveBeenCalledWith(expect.any(Array), {
      jobId: "job2",
      maxPlaceholderRatio: 1,
    });
  });

  it("enforces the floor with the default cap for a paid regen", async () => {
    await buildImageSpecForRegen(snap(), "job2", ["s1"], false);
    expect(mockAssertFloor).toHaveBeenCalledWith(expect.any(Array), {
      jobId: "job2",
      maxPlaceholderRatio: undefined,
    });
  });
});
