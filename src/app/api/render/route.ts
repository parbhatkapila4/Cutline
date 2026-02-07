import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

const REMOTION_ENTRY = "src/remotion/index.tsx";
const COMPOSITION_ID = "CUTLINEComposition";

type RenderPayload = {
  script?: unknown;
  shotList?: unknown;
  subtitleTrack?: unknown;
  motionSpec?: unknown;
  visualSpec?: unknown;
  imageSpec?: unknown;
  logoUrl?: string;
  logoPlacement?: "outro" | "watermark" | "hero";
  audioBase64?: string | null;
  audioFormat?: "wav" | "mp3";
};

function hasRequiredPayload(body: unknown): body is RenderPayload {
  if (body === null || typeof body !== "object") return false;
  const o = body as Record<string, unknown>;
  return (
    o.script !== undefined &&
    o.shotList !== undefined &&
    o.subtitleTrack !== undefined &&
    o.motionSpec !== undefined &&
    o.visualSpec !== undefined &&
    o.imageSpec !== undefined &&
    typeof o.imageSpec === "object" &&
    o.imageSpec !== null &&
    "entries" in o.imageSpec &&
    Array.isArray((o.imageSpec as { entries: unknown }).entries)
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error:
          "Invalid JSON body. Send pipeline data: script, shotList, subtitleTrack, motionSpec, visualSpec, imageSpec, audioBase64 (optional).",
      },
      { status: 400 }
    );
  }

  if (!hasRequiredPayload(body)) {
    return NextResponse.json(
      {
        error:
          "Missing required fields: script, shotList, subtitleTrack, motionSpec, visualSpec, imageSpec.",
      },
      { status: 400 }
    );
  }

  const cwd = process.cwd();
  const tempDir = path.join(cwd, ".remotion-temp");
  const outputDir = path.join(cwd, "public", "output");

  try {
    fs.mkdirSync(tempDir, { recursive: true });
    fs.mkdirSync(outputDir, { recursive: true });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to create temp or output directory." },
      { status: 500 }
    );
  }

  const id = Date.now().toString(36);
  const propsPath = path.join(tempDir, `props-${id}.json`);
  const outputFileName = `video-${id}.mp4`;
  const outputPath = path.join(outputDir, outputFileName);

  const props = {
    script: body.script,
    shotList: body.shotList,
    subtitleTrack: body.subtitleTrack,
    motionSpec: body.motionSpec,
    visualSpec: body.visualSpec,
    imageSpec: body.imageSpec,
    ...(body.logoUrl != null && body.logoPlacement != null
      ? { logoUrl: body.logoUrl, logoPlacement: body.logoPlacement }
      : {}),
    audioBase64: body.audioBase64 ?? null,
    audioFormat: body.audioFormat ?? "wav",
  };

  try {
    fs.writeFileSync(propsPath, JSON.stringify(props), "utf-8");
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to write props file." },
      { status: 500 }
    );
  }

  const remotionCli = path.join(
    cwd,
    "node_modules",
    "@remotion",
    "cli",
    "remotion-cli.js"
  );

  if (!fs.existsSync(remotionCli)) {
    return NextResponse.json(
      { error: "Remotion CLI not found. Run npm install." },
      { status: 500 }
    );
  }

  const RENDER_TIMEOUT_MS = 300_000;
  const result = spawnSync(
    process.execPath,
    [
      remotionCli,
      "render",
      REMOTION_ENTRY,
      COMPOSITION_ID,
      outputPath,
      "--props",
      propsPath,
    ],
    {
      cwd,
      encoding: "utf-8",
      timeout: RENDER_TIMEOUT_MS,
    }
  );

  try {
    fs.unlinkSync(propsPath);
  } catch {
  }

  if (result.error) {
    const { logServerError, sanitizeErrorMessage } = await import("@/lib/utils/error");
    logServerError("POST /api/render (spawn error)", result.error);
    return NextResponse.json(
      { error: sanitizeErrorMessage(result.error) },
      { status: 500 }
    );
  }

  if (result.status !== 0) {
    const { logServerError, sanitizeErrorMessage } = await import("@/lib/utils/error");
    const detail = `Remotion exit ${result.status}. ${result.stderr || result.stdout || ""}`;
    logServerError("POST /api/render", new Error(detail));
    return NextResponse.json(
      { error: sanitizeErrorMessage(new Error(detail)) },
      { status: 500 }
    );
  }

  return NextResponse.json({
    videoUrl: `/output/${outputFileName}`,
    message:
      "Render complete. Job queue will be added in a later prompt for async processing.",
  });
}
