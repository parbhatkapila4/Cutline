import fs from "fs";
import os from "os";
import path from "path";

const clearedKeys: string[] = [];
for (const key of ["GEMINI_API_KEY", "GOOGLE_API_KEY"] as const) {
  if (process.env[key] !== undefined) clearedKeys.push(key);
  delete process.env[key];
}
console.log(
  `[probe] cleared AI Studio env keys: ${clearedKeys.length > 0 ? clearedKeys.join(", ") : "(none were set)"
  } - GEMINI_API_KEY=${String(process.env.GEMINI_API_KEY)}, GOOGLE_API_KEY=${String(
    process.env.GOOGLE_API_KEY
  )}`
);

import {
  GoogleGenAI,
  type GenerateVideosOperation,
  type GenerateVideosResponse,
} from "@google/genai";

const DEFAULT_PROJECT = "project-46ce7070-2c60-4e12-a66";
const DEFAULT_LOCATION = "us-central1";
const DEFAULT_MODEL = "veo-3.1-fast-generate-001";
const DEFAULT_SECONDS = 4;
const DEFAULT_RATE_USD_PER_SEC = 0.1;
const DEFAULT_PROMPT =
  "A short talking-head shot: one person centred in frame, speaking directly " +
  "to camera, neutral grey background, soft even lighting, shallow depth of " +
  "field, static camera.";

const POLL_INTERVAL_MS = 10_000;
const MAX_POLL_DURATION_MS = 8 * 60 * 1000;

const OUT_DIR = path.resolve(process.cwd(), "probe-out");
interface ProbeArgs {
  model: string;
  location: string;
  project: string;
  seconds: number;
  rate: number;
  prompt: string;
  dryRun: boolean;
}

function parseArgs(argv: string[]): ProbeArgs {
  const flags = new Map<string, string>();
  let dryRun = false;

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const name = token.slice(2);
    if (name === "dry-run") {
      dryRun = true;
      continue;
    }
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      throw new Error(`Flag --${name} needs a value.`);
    }
    flags.set(name, next);
    i++;
  }

  const num = (name: string, fallback: number): number => {
    const raw = flags.get(name);
    if (raw === undefined) return fallback;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      throw new Error(`Flag --${name} must be a number, got "${raw}".`);
    }
    return parsed;
  };

  return {
    model: flags.get("model") ?? DEFAULT_MODEL,
    location: flags.get("location") ?? DEFAULT_LOCATION,
    project: flags.get("project") ?? DEFAULT_PROJECT,
    seconds: num("seconds", DEFAULT_SECONDS),
    rate: num("rate", DEFAULT_RATE_USD_PER_SEC),
    prompt: flags.get("prompt") ?? DEFAULT_PROMPT,
    dryRun,
  };
}
interface ServiceAccountFile {
  type?: string;
  client_email?: string;
  project_id?: string;
}

function resolveCredentials(): { credPath: string; clientEmail: string; fileProject: string } {
  const fromEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const credPath = path.resolve(
    fromEnv && fromEnv.trim() !== ""
      ? fromEnv
      : path.join(os.homedir(), ".gcp", "cutline-veo.json")
  );

  if (!fs.existsSync(credPath)) {
    throw new Error(
      `Service account file not found.\n` +
      `  Resolved path: ${credPath}\n` +
      `  Source: ${fromEnv ? "GOOGLE_APPLICATION_CREDENTIALS" : "default ~/.gcp/cutline-veo.json"}\n` +
      `Set GOOGLE_APPLICATION_CREDENTIALS to a service-account JSON, or place one at the default path.`
    );
  }

  let parsed: ServiceAccountFile;
  try {
    parsed = JSON.parse(fs.readFileSync(credPath, "utf8")) as ServiceAccountFile;
  } catch (err) {
    throw new Error(
      `Service account file at ${credPath} is not valid JSON: ${err instanceof Error ? err.message : String(err)
      }`
    );
  }

  if (!parsed.client_email) {
    throw new Error(
      `Service account file at ${credPath} has no client_email - is it a service-account key?`
    );
  }

  process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;

  return {
    credPath,
    clientEmail: parsed.client_email,
    fileProject: parsed.project_id ?? "(not in key file)",
  };
}


function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function slug(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function redactVideoBytes(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactVideoBytes);
  if (value === null || typeof value !== "object") return value;

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (key === "videoBytes" && typeof val === "string") {
      out[key] = {
        _redacted: true,
        preview: val.slice(0, 80),
        base64Length: val.length,
        byteLength: Buffer.byteLength(val, "base64"),
      };
      continue;
    }
    out[key] = redactVideoBytes(val);
  }
  return out;
}

function captureError(err: unknown): Record<string, unknown> {
  const capture: Record<string, unknown> = {
    capturedAt: new Date().toISOString(),
    typeofError: typeof err,
    isError: err instanceof Error,
    constructorName:
      err !== null && typeof err === "object" ? err.constructor?.name ?? null : null,
  };

  if (err instanceof Error) {
    capture.name = err.name;
    capture.message = err.message;
    capture.stack = err.stack;
    if (err.cause !== undefined) {
      capture.cause =
        err.cause instanceof Error
          ? { name: err.cause.name, message: err.cause.message, stack: err.cause.stack }
          : err.cause;
    }
  } else {
    capture.raw = err;
  }

  if (err !== null && typeof err === "object") {
    const own: Record<string, unknown> = {};
    for (const key of Object.getOwnPropertyNames(err)) {
      if (key === "stack") continue;
      try {
        own[key] = (err as Record<string, unknown>)[key];
      } catch {
        own[key] = "<threw on access>";
      }
    }
    capture.ownProperties = own;


    const maybeResponse = (err as Record<string, unknown>).response;
    if (maybeResponse !== undefined) capture.responseProperty = maybeResponse;
    const maybeSdkHttp = (err as Record<string, unknown>).sdkHttpResponse;
    if (maybeSdkHttp !== undefined) capture.sdkHttpResponseProperty = maybeSdkHttp;
  }


  if (err instanceof Error) {
    try {
      const parsed: unknown = JSON.parse(err.message);
      capture.parsedMessageBody = parsed;
      if (parsed !== null && typeof parsed === "object" && "error" in parsed) {
        const inner = (parsed as { error?: Record<string, unknown> }).error;
        if (inner) {
          capture.errorCode = inner.code ?? null;
          capture.errorStatus = inner.status ?? null;
          capture.errorDetails = inner.details ?? null;
          capture.errorMessage = inner.message ?? null;
        }
      }
    } catch {
      capture.parsedMessageBody =
        "<message is not JSON - likely a google-auth-library/ADC error, not an ApiError>";
    }
  }

  return capture;
}

function writeJson(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const creds = resolveCredentials();

  console.log("");
  console.log("[probe] resolved config");
  console.log(`  project              : ${args.project}`);
  console.log(`  location             : ${args.location}`);
  console.log(`  model                : ${args.model}`);
  console.log(`  durationSeconds      : ${args.seconds}`);
  console.log(`  rate (USD/sec)       : ${args.rate}`);
  console.log(`  cost estimate (USD)  : ${(args.seconds * args.rate).toFixed(4)}`);
  console.log(`  outputGcsUri         : (deliberately unset - testing inline bytes)`);
  console.log(`  credentials file     : ${creds.credPath}`);
  console.log(`  client_email         : ${creds.clientEmail}`);
  console.log(`  key file project_id  : ${creds.fileProject}`);
  console.log(`  poll interval        : ${POLL_INTERVAL_MS / 1000}s`);
  console.log(`  poll cap             : ${MAX_POLL_DURATION_MS / 60_000} min`);
  console.log(`  dry run              : ${args.dryRun}`);
  console.log(`  prompt               : ${args.prompt}`);
  console.log("");
  const ai = new GoogleGenAI({
    vertexai: true,
    project: args.project,
    location: args.location,
  });
  console.log("[probe] GoogleGenAI client constructed (vertexai: true, no apiKey)");

  if (args.dryRun) {
    console.log("[probe] --dry-run set: credentials resolved, client constructed, no billed call made. Exiting.");
    return;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const stamp = timestamp();
  const base = `${slug(args.model)}-${slug(args.location)}-${stamp}`;

  const startedAt = Date.now();

  let operation: GenerateVideosOperation;
  try {
    console.log("[probe] calling models.generateVideos ...");
    operation = await ai.models.generateVideos({
      model: args.model,
      prompt: args.prompt,
      config: {
        aspectRatio: "16:9",
        durationSeconds: args.seconds,

      },
    });
    console.log(`[probe] operation created: ${operation.name ?? "(no name)"}`);
  } catch (err) {
    const errPath = path.join(OUT_DIR, `error-${base}.json`);
    const captured = captureError(err);
    writeJson(errPath, { phase: "generateVideos", args, ...captured });
    console.error("[probe] generateVideos FAILED");
    console.error(JSON.stringify(captured, null, 2));
    console.error(`[probe] error fixture written: ${errPath}`);
    throw err;
  }

  try {
    while (!operation.done) {
      const elapsedMs = Date.now() - startedAt;
      if (elapsedMs >= MAX_POLL_DURATION_MS) {
        throw new Error(
          `Polling cap reached after ${Math.round(elapsedMs / 1000)}s (cap ${MAX_POLL_DURATION_MS / 60_000
          } min). Operation: ${operation.name ?? "(no name)"}`
        );
      }
      console.log(`[probe] polling ... elapsed ${Math.round(elapsedMs / 1000)}s, done=${String(operation.done)}`);
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      operation = (await ai.operations.get<GenerateVideosResponse, GenerateVideosOperation>({
        operation,
      })) as GenerateVideosOperation;
    }
  } catch (err) {
    const errPath = path.join(OUT_DIR, `error-${base}.json`);
    const captured = captureError(err);
    writeJson(errPath, {
      phase: "poll",
      args,
      operationName: operation.name ?? null,
      elapsedSeconds: Math.round((Date.now() - startedAt) / 1000),
      ...captured,
    });
    console.error("[probe] polling FAILED");
    console.error(JSON.stringify(captured, null, 2));
    console.error(`[probe] error fixture written: ${errPath}`);
    throw err;
  }

  const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
  console.log(`[probe] operation done after ${elapsedSec}s`);

  const jsonPath = path.join(OUT_DIR, `${base}.json`);
  writeJson(jsonPath, {
    args,
    elapsedSeconds: elapsedSec,
    costEstimateUsd: Number((args.seconds * args.rate).toFixed(4)),
    operation: redactVideoBytes(operation),
  });
  console.log(`[probe] operation JSON written: ${jsonPath}`);

  if (operation.error) {
    const errPath = path.join(OUT_DIR, `error-${base}.json`);
    writeJson(errPath, {
      phase: "operation.error",
      args,
      operationName: operation.name ?? null,
      elapsedSeconds: elapsedSec,
      operationError: operation.error,
      operationErrorKeys: Object.keys(operation.error),
    });
    console.error("[probe] operation completed WITH ERROR:");
    console.error(JSON.stringify(operation.error, null, 2));
    console.error(`[probe] error fixture written: ${errPath}`);
    process.exitCode = 1;
    return;
  }

  const resp = operation.response;
  const generatedVideos = resp?.generatedVideos;
  const first = generatedVideos?.[0];
  const video = first?.video;

  console.log("");
  console.log("[probe] response shape");
  console.log(`  response keys             : ${resp ? Object.keys(resp).join(", ") : "(no response)"}`);
  console.log(`  generatedVideos length    : ${generatedVideos?.length ?? "(missing)"}`);
  console.log(`  raiMediaFilteredCount     : ${String(resp?.raiMediaFilteredCount)}`);
  console.log(`  raiMediaFilteredReasons   : ${JSON.stringify(resp?.raiMediaFilteredReasons)}`);
  console.log(`  generatedVideos[0] keys   : ${first ? Object.keys(first).join(", ") : "(missing)"}`);
  console.log(`  video keys                : ${video ? Object.keys(video).join(", ") : "(missing)"}`);
  console.log(`  video.uri                 : ${video?.uri ?? "(absent)"}`);
  console.log(`  video.mimeType            : ${video?.mimeType ?? "(absent)"}`);
  console.log("");

  const videoBytes = video?.videoBytes;
  if (typeof videoBytes !== "string" || videoBytes.length === 0) {
    console.error("[probe] NO videoBytes on the returned video object.");
    console.error(
      `  This means Vertex did NOT return inline base64 for ${args.model} in ${args.location}.`
    );
    console.error(`  generatedVideos[0] : ${JSON.stringify(first, null, 2)}`);
    console.error(`  video              : ${JSON.stringify(video, null, 2)}`);
    console.error(`  full response      : ${JSON.stringify(redactVideoBytes(resp), null, 2)}`);
    console.error(`  Operation JSON already written to ${jsonPath}`);
    process.exitCode = 1;
    return;
  }

  const mp4Path = path.join(OUT_DIR, `${base}.mp4`);
  const buffer = Buffer.from(videoBytes, "base64");
  fs.writeFileSync(mp4Path, buffer);

  const sizeMb = buffer.byteLength / (1024 * 1024);
  console.log("[probe] SUCCESS");
  console.log(`  mp4                  : ${mp4Path}`);
  console.log(`  size                 : ${sizeMb.toFixed(2)} MB (${buffer.byteLength} bytes)`);
  console.log(`  wall clock           : ${elapsedSec}s`);
  console.log(`  cost estimate (USD)  : ${(args.seconds * args.rate).toFixed(4)} (${args.seconds}s x ${args.rate})`);
  console.log(`  operation JSON       : ${jsonPath}`);
}

main().catch((err: unknown) => {
  console.error("");
  console.error("[probe] aborted:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
