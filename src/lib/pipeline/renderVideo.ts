import { spawn, type ChildProcess } from "child_process";
import fs from "fs";
import path from "path";

import type {
  MotionSpec,
  Script,
  ShotList,
  SubtitleTrack,
  VisualSpec,
} from "@/lib/types";
import type { ImageSpec } from "@/lib/images/types";

const REMOTION_ENTRY = "src/remotion/index.tsx";
const COMPOSITION_ID = "CUTLINEComposition";
const DEFAULT_RENDER_TIMEOUT_MS = 600_000;
const MIN_RENDER_TIMEOUT_MS = 60_000;
const MAX_RENDER_TIMEOUT_MS = 3_600_000;
const TIMEOUT_TOLERANCE_MS = 5_000;
const OOM_SIGNATURE_RE = /\bSIGKILL\b|\bENOMEM\b|out of memory|cannot allocate memory/i;
const MAX_RENDER_STDERR_CHARS = 2000;
const MAX_CAPTURED_OUTPUT_CHARS = 1024 * 1024;
const CAPTURED_OUTPUT_TAIL_CHARS = 64 * 1024;
const PROPS_RETENTION_MS = 24 * 60 * 60 * 1000;
const MAX_KEPT_PROPS_FILES = 20;
const RENDER_FPS = 30;
const RENDER_KILL_GRACE_MS = 2_000;
const RENDER_EXIT_WAIT_AFTER_KILL_MS = 10_000;
const RENDER_OUTPUT_DRAIN_MS = 2_000;
const RENDER_TAG_ENV = "CUTLINE_RENDER_TAG";
const IS_WINDOWS = process.platform === "win32";
const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;
const DEFAULT_DURATION_SECONDS = 30;

const warnedRenderTimeouts = new Set<string>();

export function renderedDurationSeconds(durationSeconds: number): number {
  return Math.ceil(durationSeconds * RENDER_FPS) / RENDER_FPS;
}

export function getRenderTimeoutMs(): number {
  const raw = process.env.RENDER_TIMEOUT_MS?.trim();
  if (!raw) return DEFAULT_RENDER_TIMEOUT_MS;
  const requested = Number(raw);
  let timeoutMs = Math.round(requested);
  let problem: string | null = null;
  if (!Number.isFinite(requested) || requested <= 0) {
    timeoutMs = DEFAULT_RENDER_TIMEOUT_MS;
    problem = "is not a positive number of milliseconds";
  } else if (requested < MIN_RENDER_TIMEOUT_MS) {
    timeoutMs = MIN_RENDER_TIMEOUT_MS;
    problem = "is under the 60 s minimum";
  } else if (requested > MAX_RENDER_TIMEOUT_MS) {
    timeoutMs = MAX_RENDER_TIMEOUT_MS;
    problem =
      "is over the 60 min maximum (the worker runs one job at a time, so every job queued behind a render waits for it)";
  }
  if (problem && !warnedRenderTimeouts.has(raw)) {
    warnedRenderTimeouts.add(raw);
    console.warn(`[render] RENDER_TIMEOUT_MS=${JSON.stringify(raw)} ${problem}; using ${timeoutMs} ms.`);
  }
  return timeoutMs;
}

export class RenderTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RenderTimeoutError";
  }
}
export class RenderOutOfMemoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RenderOutOfMemoryError";
  }
}

export class RenderKilledError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RenderKilledError";
  }
}

export class RenderCancelledError extends Error {
  constructor() {
    super("Job cancelled");
    this.name = "RenderCancelledError";
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitAtMost(promise: Promise<unknown>, ms: number): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([promise, new Promise((resolve) => { timer = setTimeout(resolve, ms); })]);
  clearTimeout(timer);
}

function signalRenderGroup(pid: number | undefined, signal: NodeJS.Signals): boolean {
  if (IS_WINDOWS) return false;
  if (!Number.isInteger(pid) || pid == null || pid <= 1 || pid === process.pid) return false;
  try {
    process.kill(-pid, signal);
    return true;
  } catch {
    return false;
  }
}
function signalTaggedRenderProcesses(tag: string, signal: NodeJS.Signals): number[] {
  if (IS_WINDOWS) return [];
  const needle = `${RENDER_TAG_ENV}=${tag}`;
  const signalled: number[] = [];
  let entries: string[];
  try {
    entries = fs.readdirSync("/proc");
  } catch {
    return signalled;
  }
  for (const entry of entries) {
    if (!/^[0-9]+$/.test(entry)) continue;
    const pid = Number(entry);
    if (pid === process.pid) continue;
    try {
      if (!fs.readFileSync(`/proc/${entry}/environ`, "utf-8").includes(needle)) continue;
      process.kill(pid, signal);
      signalled.push(pid);
    } catch {
    }
  }
  return signalled;
}

function killWindowsProcessTree(pid: number): Promise<void> {
  return new Promise((resolve) => {
    const killer = spawn("taskkill", ["/T", "/F", "/PID", String(pid)], {
      stdio: "ignore",
      windowsHide: true,
    });
    killer.once("error", () => resolve());
    killer.once("exit", () => resolve());
  });
}

async function terminateRenderTree(
  pid: number | undefined,
  tag: string,
  traceId: string
): Promise<void> {
  try {
    if (IS_WINDOWS) {
      if (pid != null) await killWindowsProcessTree(pid);
      return;
    }

    const groupTerm = signalRenderGroup(pid, "SIGTERM");
    const taggedTerm = signalTaggedRenderProcesses(tag, "SIGTERM");
    if (!groupTerm && taggedTerm.length === 0) return;

    await delay(RENDER_KILL_GRACE_MS);

    const groupKill = signalRenderGroup(pid, "SIGKILL");
    const taggedKill = signalTaggedRenderProcesses(tag, "SIGKILL");
    console.warn(
      `[render] jobId=${traceId} reaped render process tree pgid=${pid ?? "?"} ` +
      `group(SIGTERM=${groupTerm} SIGKILL=${groupKill}) ` +
      `tagged(SIGTERM=${taggedTerm.length} survived=${taggedKill.length})`
    );
  } catch (e) {
    console.warn(
      `[render] jobId=${traceId} process-tree reap failed: ` +
      (e instanceof Error ? e.message : String(e))
    );
  }
}

async function sweepRenderLeftovers(
  pid: number | undefined,
  tag: string,
  traceId: string,
  failed: boolean
): Promise<void> {
  if (IS_WINDOWS) return;
  if (failed) {
    await terminateRenderTree(pid, tag, traceId);
    return;
  }
  const swept = signalTaggedRenderProcesses(tag, "SIGKILL");
  if (swept.length > 0) {
    console.warn(
      `[render] jobId=${traceId} render exited cleanly but left ${swept.length} ` +
      `tagged process(es) behind; killed ${swept.join(",")}`
    );
  }
}

class CapturedOutput {
  private head = "";
  private tail = "";
  private omitted = 0;

  append(chunk: string): void {
    let rest = chunk;
    if (this.head.length < MAX_CAPTURED_OUTPUT_CHARS) {
      const room = MAX_CAPTURED_OUTPUT_CHARS - this.head.length;
      this.head += rest.slice(0, room);
      rest = rest.slice(room);
      if (!rest) return;
    }
    this.tail += rest;
    if (this.tail.length > CAPTURED_OUTPUT_TAIL_CHARS) {
      this.omitted += this.tail.length - CAPTURED_OUTPUT_TAIL_CHARS;
      this.tail = this.tail.slice(-CAPTURED_OUTPUT_TAIL_CHARS);
    }
  }

  text(): string {
    if (this.omitted > 0) return `${this.head}\n…[${this.omitted} chars omitted]…\n${this.tail}`;
    return this.head + this.tail;
  }
}

type RenderStop = "timeout" | "cancelled";

type RenderExit = {
  status: number | null;
  signal: NodeJS.Signals | null;
  error?: NodeJS.ErrnoException;
};

export type RenderProcessOptions = {
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  renderTag: string;
  traceId: string;
  timeoutMs: number;
  signal?: AbortSignal;
  command?: string;
  scratchDir?: string;
};

export type RenderProcessResult = {
  status: number | null;
  signal: NodeJS.Signals | null;
  errorCode?: string;
  errorMessage?: string;
  stdout: string;
  stderr: string;
  stoppedBy: RenderStop | null;
};

async function removeScratchDir(dir: string, traceId: string): Promise<void> {
  try {
    await fs.promises.rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  } catch (e) {
    console.warn(
      `[render] jobId=${traceId} could not remove render temp dir ${dir}: ` +
      (e instanceof Error ? e.message : String(e))
    );
  }
}

export async function runRenderProcess(options: RenderProcessOptions): Promise<RenderProcessResult> {
  const { scratchDir, traceId } = options;
  if (!scratchDir) return runRenderChild(options);
  try {
    fs.mkdirSync(scratchDir, { recursive: true });
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    return {
      status: null,
      signal: null,
      errorCode: err.code,
      errorMessage: err.message,
      stdout: "",
      stderr: "",
      stoppedBy: null,
    };
  }
  try {
    return await runRenderChild({
      ...options,
      env: { ...options.env, TMPDIR: scratchDir, TMP: scratchDir, TEMP: scratchDir },
    });
  } finally {
    await removeScratchDir(scratchDir, traceId);
  }
}

async function runRenderChild(options: RenderProcessOptions): Promise<RenderProcessResult> {
  const { args, cwd, env, renderTag, traceId, timeoutMs, signal } = options;
  const stdout = new CapturedOutput();
  const stderr = new CapturedOutput();

  let child: ChildProcess;
  try {
    child = spawn(options.command ?? process.execPath, args, {
      cwd,
      env,
      detached: !IS_WINDOWS,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    return {
      status: null,
      signal: null,
      errorCode: err.code,
      errorMessage: err.message,
      stdout: "",
      stderr: "",
      stoppedBy: null,
    };
  }

  child.stdout?.setEncoding("utf-8");
  child.stdout?.on("data", (chunk: string) => stdout.append(chunk));
  child.stderr?.setEncoding("utf-8");
  child.stderr?.on("data", (chunk: string) => stderr.append(chunk));
  const closed = new Promise<void>((resolve) => child.once("close", () => resolve()));

  let exited = false;
  let resolveExit!: (exit: RenderExit) => void;
  const exitPromise = new Promise<RenderExit>((resolve) => {
    resolveExit = resolve;
  });
  const settle = (exit: RenderExit) => {
    if (exited) return;
    exited = true;
    resolveExit(exit);
  };
  child.once("exit", (status, exitSignal) => settle({ status, signal: exitSignal }));
  child.once("error", (error: NodeJS.ErrnoException) => settle({ status: null, signal: null, error }));

  let stoppedBy = null as RenderStop | null;
  let stopping = null as Promise<void> | null;
  let stuckTimer: ReturnType<typeof setTimeout> | undefined;
  const stop = (reason: RenderStop) => {
    if (stoppedBy || exited) return;
    stoppedBy = reason;
    console.warn(
      `[render] jobId=${traceId} stopping the render: ` +
      (reason === "timeout" ? `over its ${Math.round(timeoutMs / 1000)}s budget` : "the job was cancelled")
    );
    stopping = terminateRenderTree(child.pid, renderTag, traceId).then(() => {
      if (exited) return;
      stuckTimer = setTimeout(
        () => settle({ status: null, signal: "SIGKILL" }),
        RENDER_EXIT_WAIT_AFTER_KILL_MS
      );
    });
  };
  const timeoutTimer = setTimeout(() => stop("timeout"), timeoutMs);
  const onAbort = () => stop("cancelled");
  signal?.addEventListener("abort", onAbort, { once: true });
  if (signal?.aborted) onAbort();

  const exit = await exitPromise;
  clearTimeout(timeoutTimer);
  signal?.removeEventListener("abort", onAbort);
  if (stopping) {
    await stopping;
  } else {
    const failed = exit.status !== 0 || exit.signal != null || exit.error != null;
    await sweepRenderLeftovers(child.pid, renderTag, traceId, failed);
  }
  clearTimeout(stuckTimer);
  await waitAtMost(closed, RENDER_OUTPUT_DRAIN_MS);

  return {
    status: exit.status,
    signal: exit.signal,
    errorCode: stoppedBy === "timeout" ? "ETIMEDOUT" : exit.error?.code,
    errorMessage: stoppedBy === "timeout" ? undefined : exit.error?.message,
    stdout: stdout.text(),
    stderr: stderr.text(),
    stoppedBy,
  };
}

function renderFailureDetail(result: {
  stderr?: string | null;
  stdout?: string | null;
}): string {
  const raw = (result.stderr || result.stdout || "").trim();
  if (!raw) return "";
  const body =
    raw.length > MAX_RENDER_STDERR_CHARS
      ? raw.slice(0, MAX_RENDER_STDERR_CHARS) + "…[truncated]"
      : raw;
  return "\n" + body;
}

export type RenderSpawnOutcome = {
  status: number | null;
  signal: NodeJS.Signals | null;
  errorCode?: string | undefined;
  errorMessage?: string | undefined;
  stdout?: string | null;
  stderr?: string | null;
  elapsedMs: number;
  propsPath: string;
};

export function classifyRenderResult(outcome: RenderSpawnOutcome): Error | null {
  const { status, signal, errorCode, errorMessage, elapsedMs, propsPath } = outcome;
  const timeoutMs = getRenderTimeoutMs();
  const elapsedSec = Math.round(elapsedMs / 1000);
  const budgetSec = Math.round(timeoutMs / 1000);
  const detail = renderFailureDetail(outcome);
  const kept = `\nRemotion props kept for reproduction: ${propsPath}`;

  const weTimedOut =
    errorCode === "ETIMEDOUT" ||
    (signal === "SIGTERM" && elapsedMs >= timeoutMs - TIMEOUT_TOLERANCE_MS);

  if (weTimedOut) {
    return new RenderTimeoutError(
      `Remotion render timed out after ${elapsedSec}s (budget ${budgetSec}s). Try a shorter video or raise RENDER_TIMEOUT_MS.${kept}${detail}`
    );
  }

  if (signal === "SIGKILL") {
    return new RenderOutOfMemoryError(
      `Remotion render was killed by SIGKILL after ${elapsedSec}s of a ${budgetSec}s budget — the renderer ran out of memory. Try a shorter video, or give the worker more RAM.${kept}${detail}`
    );
  }

  if (signal === "SIGTERM") {
    return new RenderKilledError(
      `Remotion render was terminated by SIGTERM after ${elapsedSec}s, far short of its ${budgetSec}s budget — an external signal stopped the process (container shutdown, redeploy, or eviction). The render itself was not slow.${kept}${detail}`
    );
  }

  if (errorMessage != null) {
    return new Error(`Render failed after ${elapsedSec}s: ${errorMessage}${kept}`);
  }

  if (status !== 0) {
    const raw = (outcome.stderr || outcome.stdout || "").trim();
    if (OOM_SIGNATURE_RE.test(raw)) {
      return new RenderOutOfMemoryError(
        `Remotion render ran out of memory after ${elapsedSec}s (exit ${status}); a child process was killed by the OS.${kept}${detail}`
      );
    }
    return new Error(
      `Remotion render failed (exit ${status}) after ${elapsedSec}s.${kept}${detail}`
    );
  }

  return null;
}

export type RenderInput = {
  script: Script;
  shotList: ShotList;
  subtitleTrack: SubtitleTrack;
  showCaptions?: boolean;
  motionSpec: MotionSpec;
  visualSpec: VisualSpec;
  imageSpec: ImageSpec;
  audioBase64: string | null;
  audioFormat?: "wav" | "mp3";
  logoUrl?: string;
  logoPlacement?: "outro" | "watermark" | "hero";
  width?: number;
  height?: number;
  durationSeconds?: number;
};

function normalizeSubtitleChunks(
  chunks: SubtitleTrack["chunks"]
): Array<{ text: string; startMs: number; endMs: number; shotId: string }> {
  if (!Array.isArray(chunks)) return [];
  return chunks.map((c) => {
    const text = typeof c.text === "string" ? c.text : "";
    let startMs: number;
    let endMs: number;
    const shotId = typeof c.shotId === "string" ? c.shotId : "";
    const withTime = c as unknown as { startTime?: number; duration?: number };
    if (
      typeof withTime.startTime === "number" &&
      typeof withTime.duration === "number"
    ) {
      startMs = withTime.startTime * 1000;
      endMs = startMs + withTime.duration * 1000;
    } else if (typeof c.startMs === "number" && typeof c.endMs === "number") {
      startMs = c.startMs;
      endMs = c.endMs;
    } else {
      startMs = 0;
      endMs = 0;
    }
    if (endMs <= startMs) endMs = startMs + 1;
    return { text, startMs, endMs, shotId };
  });
}

export function buildRemotionProps(input: RenderInput): Record<string, unknown> {
  const normalizedTrack = {
    chunks: normalizeSubtitleChunks(input.subtitleTrack?.chunks ?? []),
  };
  const base: Record<string, unknown> = {
    script: input.script,
    shotList: input.shotList,
    subtitleTrack: normalizedTrack,
    showCaptions: input.showCaptions ?? (normalizedTrack.chunks.length > 0),
    motionSpec: input.motionSpec,
    visualSpec: input.visualSpec,
    imageSpec: input.imageSpec,
    ...(input.logoUrl && input.logoPlacement
      ? { logoUrl: input.logoUrl, logoPlacement: input.logoPlacement }
      : {}),
    audioBase64: input.audioBase64,
    audioFormat: input.audioFormat ?? "wav",
  };
  if (typeof input.width === "number") base.width = input.width;
  if (typeof input.height === "number") base.height = input.height;
  if (typeof input.durationSeconds === "number" && input.durationSeconds > 0) base.durationSeconds = input.durationSeconds;
  return base;
}

function sanitizeForFilename(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, "-").slice(0, 64);
}

function prunePropsFiles(tempDir: string, now: number): void {
  try {
    const entries = fs
      .readdirSync(tempDir)
      .filter((name) => name.startsWith("props-") && name.endsWith(".json"))
      .map((name) => {
        const full = path.join(tempDir, name);
        try {
          return { full, mtimeMs: fs.statSync(full).mtimeMs };
        } catch {
          return null;
        }
      })
      .filter((e): e is { full: string; mtimeMs: number } => e !== null)
      .sort((a, b) => b.mtimeMs - a.mtimeMs);

    entries.forEach((entry, index) => {
      if (index < MAX_KEPT_PROPS_FILES && now - entry.mtimeMs <= PROPS_RETENTION_MS) {
        return;
      }
      try {
        fs.unlinkSync(entry.full);
      } catch {
      }
    });
  } catch {
  }
}

function pruneStaleScratchDirs(tempDir: string, now: number): void {
  try {
    for (const name of fs.readdirSync(tempDir)) {
      if (!name.startsWith("tmp-")) continue;
      const full = path.join(tempDir, name);
      try {
        if (now - fs.statSync(full).mtimeMs > PROPS_RETENTION_MS) {
          fs.rmSync(full, { recursive: true, force: true });
        }
      } catch {
      }
    }
  } catch {
  }
}

export async function runRemotionRender(
  input: RenderInput,
  outputPath: string,
  jobId?: string,
  options: { signal?: AbortSignal } = {}
): Promise<void> {
  if (options.signal?.aborted) throw new RenderCancelledError();
  const cwd = process.cwd();
  const tempDir = path.join(cwd, ".remotion-temp");

  try {
    fs.mkdirSync(tempDir, { recursive: true });
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  } catch (e) {
    throw new Error("Failed to create temp or output directory.");
  }

  prunePropsFiles(tempDir, Date.now());
  pruneStaleScratchDirs(tempDir, Date.now());

  const traceId =
    sanitizeForFilename(jobId ?? path.basename(outputPath, ".mp4")) || "unknown";
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const propsPath = path.join(tempDir, `props-${traceId}-${id}.json`);
  const props = buildRemotionProps(input);

  try {
    fs.writeFileSync(propsPath, JSON.stringify(props), "utf-8");
  } catch (e) {
    throw new Error("Failed to write props file.");
  }

  const rawWidth = props.width;
  const rawHeight = props.height;
  const rawDuration = props.durationSeconds;
  const hasDimensions = typeof rawWidth === "number" && typeof rawHeight === "number";
  const width = typeof rawWidth === "number" ? rawWidth : DEFAULT_WIDTH;
  const height = typeof rawHeight === "number" ? rawHeight : DEFAULT_HEIGHT;
  const durationSeconds =
    typeof rawDuration === "number" && rawDuration > 0
      ? rawDuration
      : input.shotList?.totalDurationSeconds ?? DEFAULT_DURATION_SECONDS;
  const frames = Math.ceil(durationSeconds * RENDER_FPS);
  const dimensionSource = hasDimensions
    ? "from props"
    : "Root.tsx default - no width/height in props";

  console.log(
    `[render] jobId=${traceId} ${width}x${height} (${dimensionSource}) ` +
    `${frames} frames @ ${RENDER_FPS}fps (${durationSeconds.toFixed(1)}s) ` +
    `props=${propsPath}`
  );

  const remotionCli = path.join(
    cwd,
    "node_modules",
    "@remotion",
    "cli",
    "remotion-cli.js"
  );

  if (!fs.existsSync(remotionCli)) {
    throw new Error(
      `Remotion CLI not found at ${remotionCli}. Run npm install.`
    );
  }

  const renderTag = `${traceId}-${id}`;
  const startedAt = Date.now();
  const result = await runRenderProcess({
    args: [
      remotionCli,
      "render",
      REMOTION_ENTRY,
      COMPOSITION_ID,
      outputPath,
      "--props",
      propsPath,
      "--codec",
      "h264",
      "--crf",
      "15",
      "--jpeg-quality",
      "100",
      "--pixel-format",
      "yuv420p",
      "--color-space",
      "bt709",
      "--audio-bitrate",
      "192k",
      "--audio-codec",
      "aac",
      "--enforce-audio-track",
      "--concurrency",
      "1",
    ],
    cwd,
    env: { ...process.env, [RENDER_TAG_ENV]: renderTag },
    renderTag,
    traceId,
    timeoutMs: getRenderTimeoutMs(),
    signal: options.signal,
    scratchDir: path.join(tempDir, `tmp-${id}`),
  });

  const elapsedMs = Date.now() - startedAt;
  if (result.stoppedBy === "cancelled") {
    console.log(
      `[render] jobId=${traceId} stopped after ${Math.round(elapsedMs / 1000)}s because the job was cancelled`
    );
    try {
      fs.unlinkSync(propsPath);
    } catch {
    }
    throw new RenderCancelledError();
  }

  const failure = classifyRenderResult({
    status: result.status,
    signal: result.signal,
    errorCode: result.errorCode,
    errorMessage: result.errorMessage,
    stdout: result.stdout,
    stderr: result.stderr,
    elapsedMs,
    propsPath,
  });
  if (failure) {
    throw failure;
  }

  try {
    fs.unlinkSync(propsPath);
  } catch {
  }
}
