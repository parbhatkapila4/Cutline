import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/cost/budget", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/cost/budget")>();
  return {
    ...actual,
    adjustSpendUsd: vi.fn(async () => {
      throw new Error("redis down");
    }),
    releaseCinematicSeconds: vi.fn(async () => { }),
  };
});

import { releaseReservation, emptyReservation } from "@/lib/jobs/admission";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("releaseReservation", () => {
  it("logs the leak and does not throw when the underlying release fails", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => { });
    const reservation = { ...emptyReservation("leak-user"), spendUsd: 0.09 };

    await expect(releaseReservation(reservation)).resolves.toBeUndefined();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0][0])).toContain("leak-user");
  });

  it("does nothing when there is no reservation to release", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => { });

    await releaseReservation(emptyReservation("nobody"));

    expect(spy).not.toHaveBeenCalled();
  });
});
