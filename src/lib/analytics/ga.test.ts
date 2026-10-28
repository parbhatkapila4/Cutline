import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { trackCheckoutStart, trackGenerateFailed, trackSignUp } from "./ga";

type Fake = { gtag?: ReturnType<typeof vi.fn>; datafast?: ReturnType<typeof vi.fn> & { q?: unknown[] } };

let win: Fake;

beforeEach(() => {
  win = {};
  vi.stubGlobal("window", win);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("analytics events", () => {
  it("reach DataFast with every parameter as a string", () => {
    win.datafast = vi.fn();
    trackGenerateFailed("slideshow", "free", "RATE_LIMITED");
    expect(win.datafast).toHaveBeenCalledWith("generate_failed", {
      mode: "slideshow",
      plan: "free",
      error_code: "RATE_LIMITED",
    });
  });

  it("still reach Google Analytics", () => {
    win.gtag = vi.fn();
    trackCheckoutStart("professional");
    expect(win.gtag).toHaveBeenCalledWith("event", "checkout_start", { plan: "professional" });
  });

  it("are queued for DataFast when its script has not loaded yet", () => {
    trackSignUp();
    expect(typeof win.datafast).toBe("function");
    expect(win.datafast?.q).toHaveLength(1);
    expect(win.datafast?.q?.[0]).toEqual(["sign_up", undefined]);
  });

  it("do not need Google Analytics to be configured", () => {
    win.datafast = vi.fn();
    expect(() => trackSignUp()).not.toThrow();
    expect(win.datafast).toHaveBeenCalledWith("sign_up", undefined);
  });

  it("never throw into the page when a tracker fails", () => {
    win.gtag = vi.fn(() => {
      throw new Error("blocked");
    });
    win.datafast = vi.fn(() => {
      throw new Error("blocked");
    });
    expect(() => trackSignUp()).not.toThrow();
  });
});
