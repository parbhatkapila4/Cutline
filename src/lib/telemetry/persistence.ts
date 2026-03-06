import fs from "fs";
import path from "path";
import type { JobTelemetry } from "./types";

export function getTelemetryFilePath(): string | undefined {
  const v = process.env.TELEMETRY_FILE ?? process.env.TELEMETRY_PERSIST_PATH;
  if (typeof v !== "string" || v.trim() === "") return undefined;
  return v.trim();
}

function safeLog(message: string, err?: unknown): void {
  try {
    console.warn("[telemetry] " + message + (err ? " " + String(err) : ""));
  } catch {
  }
}

export function loadTelemetryFromFile(): JobTelemetry[] {
  const filePath = getTelemetryFilePath();
  if (!filePath) return [];

  try {
    const resolved = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(resolved)) return [];

    const raw = fs.readFileSync(resolved, "utf8");
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) return [];

    const jobs: JobTelemetry[] = [];
    for (let i = 0; i < parsed.length; i++) {
      const item = parsed[i];
      if (
        item != null &&
        typeof item === "object" &&
        typeof (item as JobTelemetry).jobId === "string" &&
        typeof (item as JobTelemetry).status === "string" &&
        typeof (item as JobTelemetry).startedAt === "string" &&
        Array.isArray((item as JobTelemetry).stages)
      ) {
        jobs.push(item as JobTelemetry);
      }
    }
    return jobs;
  } catch (e) {
    safeLog("loadTelemetryFromFile failed", e);
    return [];
  }
}

export function saveTelemetryToFile(jobs: JobTelemetry[]): void {
  const filePath = getTelemetryFilePath();
  if (!filePath) return;

  try {
    const resolved = path.resolve(process.cwd(), filePath);
    const dir = path.dirname(resolved);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const data = JSON.stringify(jobs);
    fs.writeFileSync(resolved, data, "utf8");
  } catch (e) {
    safeLog("saveTelemetryToFile failed", e);
  }
}
