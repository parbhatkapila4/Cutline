import { describe, it, expect } from "vitest";
import {
  buildRemotionProps,
  classifyRenderResult,
  type RenderInput,
  type RenderSpawnOutcome,
} from "./renderVideo";
import { mapFailedReasonToFailureCode } from "@/lib/utils/error";
import { shouldRetryForRender } from "@/lib/utils/retry";

const BUDGET_MS = 600_000;

const outcome = (overrides: Partial<RenderSpawnOutcome> = {}): RenderSpawnOutcome => ({
  status: 0,
  signal: null,
  elapsedMs: 120_000,
  propsPath: "/tmp/props-job-abc.json",
  ...overrides,
});

const minimalRenderInput = (overrides: Partial<RenderInput> = {}): RenderInput =>
  ({
    script: { entries: [] },
    shotList: { shots: [], totalDurationSeconds: 30 },
    subtitleTrack: { chunks: [] },
    motionSpec: { entries: [] },
    visualSpec: { entries: [] },
    imageSpec: { entries: [] },
    audioBase64: null,
    ...overrides,
  }) as RenderInput;

describe("buildRemotionProps", () => {
  it("sets showCaptions to false when input.showCaptions is false and subtitle track is empty", () => {
    const input = minimalRenderInput({
      showCaptions: false,
      subtitleTrack: { chunks: [] },
    });
    const props = buildRemotionProps(input);
    expect(props.showCaptions).toBe(false);
    expect(props.subtitleTrack).toEqual({ chunks: [] });
  });

  it("sets showCaptions to false when input has empty subtitle track and showCaptions false (captions off)", () => {
    const input = minimalRenderInput({
      showCaptions: false,
      subtitleTrack: { chunks: [] },
    });
    const props = buildRemotionProps(input);
    expect(props.showCaptions).toBe(false);
  });

  it("sets showCaptions to true when input has chunks and showCaptions undefined (default)", () => {
    const input = minimalRenderInput({
      subtitleTrack: {
        chunks: [
          { text: "Hello", startMs: 0, endMs: 500, shotId: "s1" },
        ],
      },
    });
    const props = buildRemotionProps(input);
    expect(props.showCaptions).toBe(true);
  });

  it("sets showCaptions to true when input.showCaptions is true even with empty chunks", () => {
    const input = minimalRenderInput({
      showCaptions: true,
      subtitleTrack: { chunks: [] },
    });
    const props = buildRemotionProps(input);
    expect(props.showCaptions).toBe(true);
  });
});

describe("classifyRenderResult", () => {
  it("clean exit classifies as success", () => {
    expect(classifyRenderResult(outcome())).toBeNull();
  });

  it("our own timeout wins over the SIGTERM it was delivered with", () => {
    const err = classifyRenderResult(
      outcome({ status: null, signal: "SIGTERM", errorCode: "ETIMEDOUT", errorMessage: "spawnSync node ETIMEDOUT", elapsedMs: BUDGET_MS })
    );
    expect(err?.name).toBe("RenderTimeoutError");
    expect(err?.message).toContain("Remotion render timed out after 600s (budget 600s)");
    expect(mapFailedReasonToFailureCode(err?.message)).toBe("TIMEOUT");
    expect(shouldRetryForRender(err)).toBe(false);
  });

  it("classifies a timeout from elapsed time alone when ETIMEDOUT is absent", () => {
    const err = classifyRenderResult(
      outcome({ status: null, signal: "SIGTERM", elapsedMs: BUDGET_MS - 1_000 })
    );
    expect(err?.name).toBe("RenderTimeoutError");
  });

  it("a SIGKILL we did not send is still MEMORY", () => {
    const err = classifyRenderResult(outcome({ status: null, signal: "SIGKILL", elapsedMs: 143_000 }));
    expect(err?.name).toBe("RenderOutOfMemoryError");
    expect(err?.message).toContain("Remotion render was killed by SIGKILL after 143s of a 600s budget");
    expect(mapFailedReasonToFailureCode(err?.message)).toBe("MEMORY");
    expect(shouldRetryForRender(err)).toBe(false);
  });

  it("an early SIGTERM is an external kill, not a timeout", () => {
    const err = classifyRenderResult(outcome({ status: null, signal: "SIGTERM", elapsedMs: 118_000 }));
    expect(err?.name).toBe("RenderKilledError");
    expect(err?.message).toContain("Remotion render was terminated by SIGTERM after 118s");
    expect(mapFailedReasonToFailureCode(err?.message)).toBe("EXTERNAL_KILL");
  });

  it("a non-timeout spawn error keeps the generic shape", () => {
    const err = classifyRenderResult(
      outcome({ status: null, signal: null, errorCode: "ENOENT", errorMessage: "spawnSync node ENOENT" })
    );
    expect(err?.name).toBe("Error");
    expect(err?.message).toContain("Render failed after 120s: spawnSync node ENOENT");
  });

  it("a non-zero exit whose output smells of OOM is MEMORY", () => {
    const err = classifyRenderResult(
      outcome({ status: 1, stderr: "FFmpeg quit with code null (SIGKILL)", elapsedMs: 143_000 })
    );
    expect(err?.name).toBe("RenderOutOfMemoryError");
    expect(err?.message).toContain("Remotion render ran out of memory after 143s (exit 1)");
    expect(mapFailedReasonToFailureCode(err?.message)).toBe("MEMORY");
  });

  it("any other non-zero exit is a plain render failure and stays retryable", () => {
    const err = classifyRenderResult(outcome({ status: 1, stderr: "Error: something broke" }));
    expect(err?.name).toBe("Error");
    expect(err?.message).toContain("Remotion render failed (exit 1) after 120s");
    expect(shouldRetryForRender(err)).toBe(true);
  });

  it("keeps the operator detail off line 1 and preserves the props path", () => {
    const err = classifyRenderResult(outcome({ status: 1, stderr: "line one of stderr" }));
    const lines = (err?.message ?? "").split("\n");
    expect(lines[0]).toBe("Remotion render failed (exit 1) after 120s.");
    expect(err?.message).toContain("Remotion props kept for reproduction: /tmp/props-job-abc.json");
  });
});
