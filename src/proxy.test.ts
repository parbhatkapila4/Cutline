import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, type NextFetchEvent } from "next/server";

const track = vi.hoisted(() => vi.fn());
vi.mock("@datafast/ai-crawl", () => ({ trackAICrawlerRequest: track }));

import proxy from "./proxy";

const event = { waitUntil: vi.fn() } as unknown as NextFetchEvent;

function call(path: string, cookie?: string) {
  return proxy(
    new NextRequest(`https://cutline.example${path}`, { headers: cookie ? { cookie } : {} }),
    event,
  );
}

describe("proxy", () => {
  beforeEach(() => {
    track.mockClear();
  });

  it("reports every page request to DataFast's crawler tracking, with the event to wait on", () => {
    call("/pricing");
    expect(track).toHaveBeenCalledTimes(1);
    expect(track.mock.calls[0][1]).toBe(event);
    expect(track.mock.calls[0][2]).toMatchObject({ websiteId: expect.stringMatching(/^dfid_/) });
  });

  it("lets public pages through without asking anyone to sign in", () => {
    const res = call("/pricing");
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it.each(["/create", "/dashboard", "/dashboard/videos/abc"])(
    "still sends a signed-out visitor from %s to sign in",
    (path) => {
      const res = call(path);
      expect(res.status).toBe(307);
      expect(new URL(res.headers.get("location")!).pathname).toBe("/auth/sign-in");
    },
  );

  it("does not treat a look-alike path as a signed-in page", () => {
    expect(call("/dashboards").status).toBe(200);
    expect(call("/created").status).toBe(200);
  });

  it("lets a signed-in visitor through to the dashboard", () => {
    const res = call("/dashboard", "better-auth.session_token=abc");
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });
});
