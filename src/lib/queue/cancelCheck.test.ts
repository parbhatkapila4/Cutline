import { describe, it, expect, vi } from "vitest";
import { withCancellationWatch } from "./cancelCheck";

vi.mock("@/lib/redis/managedRedis", () => ({
  createManagedRedis: () => ({}),
  FAIL_FAST_REDIS_OPTIONS: {},
}));

function untilAborted(signal: AbortSignal): Promise<string> {
  return new Promise((resolve) => {
    signal.addEventListener("abort", () => resolve("aborted"), { once: true });
  });
}

describe("withCancellationWatch", () => {
  it("aborts the running work once the job is marked cancelled", async () => {
    const answers = [false, false, true];
    const isCancelled = vi.fn(async () => answers.shift() ?? true);

    const outcome = await withCancellationWatch("job-1", untilAborted, { intervalMs: 10, isCancelled });

    expect(outcome).toBe("aborted");
    expect(isCancelled).toHaveBeenCalledTimes(3);
    expect(isCancelled).toHaveBeenCalledWith("job-1");
  });

  it("stops polling when the work finishes on its own", async () => {
    const isCancelled = vi.fn(async () => false);

    const result = await withCancellationWatch(
      "job-2",
      () => new Promise<string>((resolve) => setTimeout(() => resolve("rendered"), 60)),
      { intervalMs: 10, isCancelled }
    );
    const callsAtFinish = isCancelled.mock.calls.length;
    await new Promise((r) => setTimeout(r, 60));

    expect(result).toBe("rendered");
    expect(callsAtFinish).toBeGreaterThan(0);
    expect(isCancelled.mock.calls.length).toBe(callsAtFinish);
  });

  it("keeps the work running when the cancel check itself fails", async () => {
    let calls = 0;
    const isCancelled = vi.fn(async () => {
      calls += 1;
      if (calls < 3) throw new Error("redis down");
      return true;
    });

    const outcome = await withCancellationWatch("job-3", untilAborted, { intervalMs: 10, isCancelled });

    expect(outcome).toBe("aborted");
    expect(calls).toBe(3);
  });

  it("passes the work's own error through", async () => {
    await expect(
      withCancellationWatch("job-4", async () => {
        throw new Error("Remotion render failed (exit 1)");
      }, { intervalMs: 10, isCancelled: async () => false })
    ).rejects.toThrow("Remotion render failed (exit 1)");
  });
});
