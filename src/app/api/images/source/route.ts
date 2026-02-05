
import { NextResponse } from "next/server";
import { sourceImages } from "@/lib/images/source";
import type { Intent, ShotList, Script } from "@/lib/types";
import type { AnalyzedAssets } from "@/lib/assets/types";
import type { AssetPaths } from "@/lib/images/source";

function isIntent(v: unknown): v is Intent {
  if (v === null || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.rawInput === "string" &&
    typeof o.tone === "string" &&
    typeof o.durationSeconds === "number"
  );
}

function isShotList(v: unknown): v is ShotList {
  if (v === null || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return Array.isArray(o.shots);
}

function isScript(v: unknown): v is Script {
  if (v === null || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return Array.isArray(o.entries);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body. Send { intent, shotList, script, analyzedAssets?, assetPaths? }." },
      { status: 400 }
    );
  }

  if (body === null || typeof body !== "object") {
    return NextResponse.json(
      { error: "Body must be an object with intent, shotList, script." },
      { status: 400 }
    );
  }

  const { intent, shotList, script, analyzedAssets, assetPaths } = body as {
    intent?: unknown;
    shotList?: unknown;
    script?: unknown;
    analyzedAssets?: unknown;
    assetPaths?: unknown;
  };

  if (!isIntent(intent)) {
    return NextResponse.json(
      { error: "Missing or invalid intent (needs rawInput, tone, durationSeconds)." },
      { status: 400 }
    );
  }
  if (!isShotList(shotList)) {
    return NextResponse.json(
      { error: "Missing or invalid shotList (needs shots array)." },
      { status: 400 }
    );
  }
  if (!isScript(script)) {
    return NextResponse.json(
      { error: "Missing or invalid script (needs entries array)." },
      { status: 400 }
    );
  }

  const validAssetPaths: AssetPaths | undefined =
    assetPaths !== null && typeof assetPaths === "object" && "productPhotos" in assetPaths
      ? (assetPaths as AssetPaths)
      : undefined;

  try {
    const imageSpec = await sourceImages(
      intent,
      shotList,
      script,
      analyzedAssets as AnalyzedAssets | undefined,
      validAssetPaths
    );
    return NextResponse.json(imageSpec);
  } catch (e) {
    const { logServerError, sanitizeErrorMessage } = await import("@/lib/utils/error");
    logServerError("POST /api/images/source", e);
    return NextResponse.json({ error: sanitizeErrorMessage(e) }, { status: 500 });
  }
}
