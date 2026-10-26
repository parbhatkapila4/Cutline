import { describe, it, expect } from "vitest";
import { absoluteVideoUrl } from "./videoLink";

const ORIGIN = "https://cutline.example";

describe("absoluteVideoUrl", () => {
  it("leaves a published Blob URL alone, which is what final_url holds in production", () => {
    const blob = "https://z2uwwzsvsptts4qi.public.blob.vercel-storage.com/videos/abc.mp4";
    expect(absoluteVideoUrl(blob, ORIGIN)).toBe(blob);
  });

  it("leaves any absolute URL alone, whatever the case of the scheme", () => {
    expect(absoluteVideoUrl("http://cdn.example/v.mp4", ORIGIN)).toBe("http://cdn.example/v.mp4");
    expect(absoluteVideoUrl("HTTPS://cdn.example/v.mp4", ORIGIN)).toBe("HTTPS://cdn.example/v.mp4");
  });

  it("puts the app's origin in front of a path the app serves itself", () => {
    expect(absoluteVideoUrl("/temp/abc.mp4", ORIGIN)).toBe("https://cutline.example/temp/abc.mp4");
  });

  it("never glues the origin onto a URL that already has one", () => {
    const blob = "https://z2uwwzsvsptts4qi.public.blob.vercel-storage.com/videos/abc.mp4";
    expect(absoluteVideoUrl(blob, ORIGIN)).not.toContain(`${ORIGIN}https`);
  });
});
