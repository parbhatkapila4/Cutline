import { describe, it, expect } from "vitest";
import { videoTitleFromPrompt } from "./videoTitle";

describe("videoTitleFromPrompt", () => {
  it("uses a short first sentence, without its full stop", () => {
    expect(
      videoTitleFromPrompt(
        "Launch video for Halden Cold Brew. Open on the pour and end on the 30-day free trial."
      )
    ).toBe("Launch video for Halden Cold Brew");
  });

  it("keeps a question or exclamation mark", () => {
    expect(videoTitleFromPrompt("Why do we dream? Explain it for kids.")).toBe("Why do we dream?");
  });

  it("skips a first 'sentence' that is only an abbreviation or a greeting", () => {
    expect(videoTitleFromPrompt("Dr. Smith explains sleep cycles")).toBe("Dr. Smith explains sleep cycles");
    expect(videoTitleFromPrompt("Hi! Welcome new members to the gym")).toBe("Hi! Welcome new members to the gym");
  });

  it("keeps a short prompt whole", () => {
    expect(videoTitleFromPrompt("Explain why we dream in 30 seconds, friendly tone")).toBe(
      "Explain why we dream in 30 seconds, friendly tone"
    );
  });

  it("cuts a long prompt at a word boundary instead of mid-word", () => {
    const title = videoTitleFromPrompt(
      "Product launch video: highlight key features and benefits, end with a clear call-to-action."
    );
    expect(title).toBe("Product launch video: highlight key features and benefits…");
    expect(title.length).toBeLessThanOrEqual(60);
  });

  it("cuts one very long word where it has to", () => {
    const title = videoTitleFromPrompt("x".repeat(90));
    expect(title).toBe(`${"x".repeat(59)}…`);
  });

  it("collapses whitespace and returns an empty title for an empty prompt", () => {
    expect(videoTitleFromPrompt("  Cold   brew\n basics  ")).toBe("Cold brew basics");
    expect(videoTitleFromPrompt("   ")).toBe("");
    expect(videoTitleFromPrompt(undefined)).toBe("");
  });
});
