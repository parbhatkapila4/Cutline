import { describe, it, expect } from "vitest";
import { FAIL_FAST_REDIS_OPTIONS } from "./managedRedis";

describe("FAIL_FAST_REDIS_OPTIONS", () => {
  it("queues commands issued while the socket is still connecting", () => {
    expect(FAIL_FAST_REDIS_OPTIONS.enableOfflineQueue).toBe(true);
  });

  it("still bounds a dead socket, which is what makes the queue safe", () => {
    expect(FAIL_FAST_REDIS_OPTIONS.maxRetriesPerRequest).toBe(2);
    expect(typeof FAIL_FAST_REDIS_OPTIONS.commandTimeout).toBe("number");
    expect(FAIL_FAST_REDIS_OPTIONS.commandTimeout).toBeGreaterThan(0);
    expect(FAIL_FAST_REDIS_OPTIONS.commandTimeout).toBeLessThanOrEqual(5000);
  });

  it("cannot spend longer connecting than the command is allowed to wait", () => {
    expect(FAIL_FAST_REDIS_OPTIONS.connectTimeout).toBeLessThanOrEqual(
      FAIL_FAST_REDIS_OPTIONS.commandTimeout as number
    );
  });
});
