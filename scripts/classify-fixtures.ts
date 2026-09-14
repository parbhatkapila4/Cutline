import fs from "fs";
import path from "path";

import { classifyVeoError } from "@/lib/veo";

const OUT_DIR = path.resolve(process.cwd(), "probe-out");

function extractRaw(fixture: Record<string, unknown>): string | null {
  if (typeof fixture.message === "string") return fixture.message;

  const own = fixture.ownProperties;
  if (own !== null && typeof own === "object") {
    const ownMessage = (own as Record<string, unknown>).message;
    if (typeof ownMessage === "string") return ownMessage;
  }

  if (fixture.operationError !== undefined && fixture.operationError !== null) {
    return JSON.stringify(fixture.operationError);
  }
  if (fixture.parsedMessageBody !== undefined && typeof fixture.parsedMessageBody === "object" && fixture.parsedMessageBody !== null) {
    return JSON.stringify(fixture.parsedMessageBody);
  }
  if (typeof fixture.errorMessage === "string") return fixture.errorMessage;

  return null;
}

function pad(value: string, width: number): string {
  return value.length >= width ? value : value + " ".repeat(width - value.length);
}

function main(): void {
  if (!fs.existsSync(OUT_DIR)) {
    console.error(`No probe-out/ directory at ${OUT_DIR}. Run "npm run probe" first.`);
    process.exitCode = 1;
    return;
  }

  const files = fs
    .readdirSync(OUT_DIR)
    .filter((f) => f.startsWith("error-") && f.endsWith(".json"))
    .sort();

  if (files.length === 0) {
    console.error(`No error-*.json fixtures in ${OUT_DIR}.`);
    process.exitCode = 1;
    return;
  }

  console.log(`Classifying ${files.length} fixture(s) from ${OUT_DIR}\n`);
  console.log(
    pad("FIXTURE", 58) + pad("HTTP", 6) + pad("RPC STATUS", 20) + pad("KIND", 20) + "ERROR CODE"
  );
  console.log("-".repeat(124));

  let failures = 0;

  for (const file of files) {
    let fixture: Record<string, unknown>;
    try {
      fixture = JSON.parse(fs.readFileSync(path.join(OUT_DIR, file), "utf8")) as Record<string, unknown>;
    } catch (err) {
      console.log(pad(file, 58) + `!! unreadable: ${err instanceof Error ? err.message : String(err)}`);
      failures++;
      continue;
    }

    const raw = extractRaw(fixture);
    if (raw === null) {
      console.log(pad(file, 58) + "!! could not extract a raw error message from this fixture");
      failures++;
      continue;
    }

    const result = classifyVeoError(raw);
    console.log(
      pad(file, 58) +
      pad(result.httpStatus === null ? "-" : String(result.httpStatus), 6) +
      pad(result.rpcStatus ?? "-", 20) +
      pad(result.kind, 20) +
      result.errorCode
    );

    if (result.kind === "generic") {
      failures++;
    }
  }

  console.log("");
  if (failures > 0) {
    console.log(
      `${failures} fixture(s) landed on the generic branch or could not be read. ` +
      "Generic means the user is told to reword their prompt - check whether that is really right for this error."
    );
  } else {
    console.log("All fixtures classified into a specific bucket; none fell through to generic prompt advice.");
  }
}

main();
