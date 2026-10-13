import { describe, it, expect, vi, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import {
  buildRemotionProps,
  classifyRenderResult,
  getRenderTimeoutMs,
  runRemotionRender,
  runRenderProcess,
  RenderCancelledError,
  type RenderInput,
  type RenderProcessOptions,
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

describe("RENDER_TIMEOUT_MS", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("defaults to 600 s when unset", () => {
    vi.stubEnv("RENDER_TIMEOUT_MS", undefined);
    expect(getRenderTimeoutMs()).toBe(BUDGET_MS);
  });

  it("uses a valid value as given", () => {
    vi.stubEnv("RENDER_TIMEOUT_MS", "900000");
    expect(getRenderTimeoutMs()).toBe(900_000);
  });

  it("falls back to the default, with a warning, for a value that is not a positive number", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => { });
    for (const value of ["ten minutes", "0", "-5"]) {
      vi.stubEnv("RENDER_TIMEOUT_MS", value);
      expect(getRenderTimeoutMs(), value).toBe(BUDGET_MS);
    }
    expect(warn).toHaveBeenCalledTimes(3);
  });

  it("clamps to 60 s - 60 min; the ceiling only guards against a typo now that the lock renews mid-render", () => {
    vi.spyOn(console, "warn").mockImplementation(() => { });
    vi.stubEnv("RENDER_TIMEOUT_MS", "1000");
    expect(getRenderTimeoutMs()).toBe(60_000);
    vi.stubEnv("RENDER_TIMEOUT_MS", "2700000");
    expect(getRenderTimeoutMs()).toBe(2_700_000);
    vi.stubEnv("RENDER_TIMEOUT_MS", "36000000");
    expect(getRenderTimeoutMs()).toBe(3_600_000);
  });

  it("reports the configured budget when a render times out", () => {
    vi.stubEnv("RENDER_TIMEOUT_MS", "900000");

    const err = classifyRenderResult(outcome({ errorCode: "ETIMEDOUT", signal: "SIGTERM", elapsedMs: 900_400 }));

    expect(err?.message.split("\n")[0]).toBe(
      "Remotion render timed out after 900s (budget 900s). Try a shorter video or raise RENDER_TIMEOUT_MS.",
    );
  });
});

describe("runRenderProcess", () => {
  const nodeScript = (script: string, overrides: Partial<RenderProcessOptions> = {}): RenderProcessOptions => ({
    args: ["-e", script],
    cwd: process.cwd(),
    env: process.env,
    renderTag: "test-render",
    traceId: "test",
    timeoutMs: 60_000,
    ...overrides,
  });

  const isRunning = (pid: number | undefined): boolean => {
    if (pid == null) return false;
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps the event loop free while the render runs", async () => {
    let ticks = 0;
    const ticker = setInterval(() => {
      ticks += 1;
    }, 25);
    try {
      const result = await runRenderProcess(nodeScript("setTimeout(() => {}, 1500)"));
      expect(result.status).toBe(0);
    } finally {
      clearInterval(ticker);
    }
    expect(ticks).toBeGreaterThanOrEqual(20);
  });

  it("collects output and the exit status of a render that fails", async () => {
    const result = await runRenderProcess(
      nodeScript("process.stdout.write('progress'); process.stderr.write('Error: boom'); process.exit(3)")
    );
    expect(result).toEqual(
      expect.objectContaining({ status: 3, signal: null, stdout: "progress", stderr: "Error: boom", stoppedBy: null })
    );
    expect(classifyRenderResult({ ...result, elapsedMs: 1_000, propsPath: "/tmp/p.json" })?.message).toContain(
      "Remotion render failed (exit 3)"
    );
  });

  it("does not kill a render for printing a lot, and keeps the start and end of what it printed", async () => {
    const result = await runRenderProcess(
      nodeScript("process.stdout.write('START' + 'x'.repeat(3 * 1024 * 1024) + 'END')")
    );
    expect(result.status).toBe(0);
    expect(result.stdout.startsWith("START")).toBe(true);
    expect(result.stdout.endsWith("END")).toBe(true);
    expect(result.stdout).toContain("chars omitted");
    expect(result.stdout.length).toBeLessThan(1.2 * 1024 * 1024);
  });

  it("stops a render that runs past its budget and reports it as a timeout", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => { });
    const startedAt = Date.now();
    const result = await runRenderProcess(
      nodeScript("console.log(process.pid); setTimeout(() => {}, 60000)", { timeoutMs: 400 })
    );
    const childPid = Number(result.stdout.trim()) || undefined;
    expect(result.stoppedBy).toBe("timeout");
    expect(result.errorCode).toBe("ETIMEDOUT");
    expect(Date.now() - startedAt).toBeLessThan(15_000);
    expect(isRunning(childPid)).toBe(false);
    const err = classifyRenderResult({ ...result, elapsedMs: 60_000, propsPath: "/tmp/p.json" });
    expect(err?.name).toBe("RenderTimeoutError");
  });

  it("stops a render in progress when the job is cancelled", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => { });
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 400);
    const startedAt = Date.now();
    const result = await runRenderProcess(
      nodeScript("console.log(process.pid); setTimeout(() => {}, 60000)", { signal: controller.signal })
    );
    const childPid = Number(result.stdout.trim()) || undefined;
    expect(result.stoppedBy).toBe("cancelled");
    expect(Date.now() - startedAt).toBeLessThan(15_000);
    expect(isRunning(childPid)).toBe(false);
  });

  it("stops at once when the job was already cancelled", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => { });
    const controller = new AbortController();
    controller.abort();
    const result = await runRenderProcess(nodeScript("setTimeout(() => {}, 60000)", { signal: controller.signal }));
    expect(result.stoppedBy).toBe("cancelled");
  });

  it("gives the render its own temp dir and removes it even when the render is stopped", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => { });
    const scratchDir = path.join(os.tmpdir(), `cutline-render-test-${process.pid}-${Date.now()}`);
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 500);
    const result = await runRenderProcess(
      nodeScript(
        "const fs = require('fs'), os = require('os'), path = require('path');" +
        "fs.writeFileSync(path.join(os.tmpdir(), 'frame-0001.jpeg'), 'x');" +
        "console.log(os.tmpdir()); setTimeout(() => {}, 60000)",
        { signal: controller.signal, scratchDir }
      )
    );
    expect(result.stoppedBy).toBe("cancelled");
    expect(path.resolve(result.stdout.trim())).toBe(path.resolve(scratchDir));
    expect(fs.existsSync(scratchDir)).toBe(false);
  });

  it("removes the render's temp dir after a clean exit too", async () => {
    const scratchDir = path.join(os.tmpdir(), `cutline-render-test-${process.pid}-${Date.now()}-ok`);
    const result = await runRenderProcess(
      nodeScript(
        "require('fs').writeFileSync(require('path').join(require('os').tmpdir(), 'bundle.js'), 'x')",
        { scratchDir }
      )
    );
    expect(result.status).toBe(0);
    expect(fs.existsSync(scratchDir)).toBe(false);
  });

  it("reports a render process that cannot start", async () => {
    const result = await runRenderProcess(
      nodeScript("", { command: "definitely-not-a-real-binary-cutline" })
    );
    expect(result.status).toBeNull();
    expect(result.errorCode).toBe("ENOENT");
    expect(classifyRenderResult({ ...result, elapsedMs: 0, propsPath: "/tmp/p.json" })?.message).toContain(
      "Render failed after 0s"
    );
  });
});

describe("render cancellation", () => {
  it("rejects before doing anything when the job is already cancelled", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      runRemotionRender(minimalRenderInput(), "/nonexistent/out.mp4", "job-x", { signal: controller.signal })
    ).rejects.toBeInstanceOf(RenderCancelledError);
  });

  it("is a cancellation everywhere downstream, and is never retried", () => {
    const err = new RenderCancelledError();
    expect(err.message).toBe("Job cancelled");
    expect(mapFailedReasonToFailureCode(err.message)).toBe("CANCELLED");
    expect(shouldRetryForRender(err)).toBe(false);
  });
});
