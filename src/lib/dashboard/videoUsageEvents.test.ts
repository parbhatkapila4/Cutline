import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  CLIENT_VIDEO_USAGE_EVENT_TYPES,
  VIDEO_USAGE_EVENT_TYPES,
  VIDEO_USAGE_SURFACES,
  isClientVideoUsageEventType,
  isVideoUsageEventType,
  isVideoUsageSurface,
  reportVideoUsage,
} from "./videoUsageEvents";

describe("the usage vocabulary", () => {
  it("has exactly the three events and three surfaces the table documents", () => {
    expect([...VIDEO_USAGE_EVENT_TYPES]).toEqual(["download", "share_copied", "play_started"]);
    expect([...VIDEO_USAGE_SURFACES]).toEqual(["dashboard", "video_page", "create_page"]);
  });

  it("lets a client report a share or a play, and never a download", () => {
    expect([...CLIENT_VIDEO_USAGE_EVENT_TYPES]).toEqual(["share_copied", "play_started"]);
    expect(isClientVideoUsageEventType("share_copied")).toBe(true);
    expect(isClientVideoUsageEventType("play_started")).toBe(true);
    expect(isClientVideoUsageEventType("download")).toBe(false);
    expect(isVideoUsageEventType("download")).toBe(true);
  });

  it.each([undefined, null, 0, "", " play_started", "PLAY_STARTED", ["play_started"], {}, "constructor"])(
    "rejects %j as an event or a surface",
    (value) => {
      expect(isVideoUsageEventType(value)).toBe(false);
      expect(isClientVideoUsageEventType(value)).toBe(false);
      expect(isVideoUsageSurface(value)).toBe(false);
    },
  );
});

describe("reportVideoUsage", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts the event to the video's events route and does not wait on it", () => {
    reportVideoUsage("job-1", "play_started", "video_page");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/videos/job-1/events");
    expect(init).toEqual({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "play_started", surface: "video_page" }),
      keepalive: true,
    });
  });

  it("encodes the id", () => {
    reportVideoUsage("a/b c", "share_copied", "create_page");

    expect(mockFetch.mock.calls[0][0]).toBe("/api/videos/a%2Fb%20c/events");
  });

  it.each([null, undefined, ""])("sends nothing without a job id (%j)", (jobId) => {
    reportVideoUsage(jobId, "play_started", "video_page");

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("stays silent when the request fails", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    expect(() => reportVideoUsage("job-1", "play_started", "video_page")).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it("stays silent when fetch itself throws", () => {
    mockFetch.mockImplementation(() => {
      throw new TypeError("bad request");
    });

    expect(() => reportVideoUsage("job-1", "play_started", "video_page")).not.toThrow();
  });
});
