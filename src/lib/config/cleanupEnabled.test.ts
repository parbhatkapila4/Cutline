import { describe, it, expect, vi, afterEach } from "vitest";
import { isCleanupEnabled } from "./cleanupEnabled";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("isCleanupEnabled", () => {
  it("is on when CLEANUP_ENABLED is unset or empty", () => {
    vi.stubEnv("CLEANUP_ENABLED", undefined);
    expect(isCleanupEnabled()).toBe(true);
    vi.stubEnv("CLEANUP_ENABLED", "");
    expect(isCleanupEnabled()).toBe(true);
  });

  it("reads the usual spellings of on and off, in any case", () => {
    for (const value of ["true", "TRUE", "1", "yes", "On", " true "]) {
      vi.stubEnv("CLEANUP_ENABLED", value);
      expect(isCleanupEnabled(), value).toBe(true);
    }
    for (const value of ["false", "FALSE", "0", "no", "Off"]) {
      vi.stubEnv("CLEANUP_ENABLED", value);
      expect(isCleanupEnabled(), value).toBe(false);
    }
  });

  it("leaves cleanup off for a value it does not recognise, and says so once", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => { });
    vi.stubEnv("CLEANUP_ENABLED", "disabled-please");

    expect(isCleanupEnabled()).toBe(false);
    expect(isCleanupEnabled()).toBe(false);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain("disabled-please");
  });
});
