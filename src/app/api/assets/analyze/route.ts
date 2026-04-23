import { NextResponse } from "next/server";
import { analyzeAssets } from "@/lib/assets/analysis";
import type { BrandColors } from "@/lib/assets/types";

function isBrandColors(v: unknown): v is BrandColors {
  if (v === null || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.primary === "string" &&
    (o.secondary === undefined || typeof o.secondary === "string")
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body. Send { assetIds: string[], brandColors?: { primary, secondary? } }." },
      { status: 400 }
    );
  }

  if (body === null || typeof body !== "object") {
    return NextResponse.json(
      { error: "Body must be an object with assetIds (array of strings)." },
      { status: 400 }
    );
  }

  const { assetIds, brandColors } = body as {
    assetIds?: unknown;
    brandColors?: unknown;
  };

  const ids =
    Array.isArray(assetIds) && assetIds.every((id) => typeof id === "string")
      ? (assetIds as string[])
      : [];

  const validBrandColors =
    brandColors !== undefined && isBrandColors(brandColors)
      ? (brandColors as BrandColors)
      : undefined;

  if (ids.length === 0 && !validBrandColors) {
    return NextResponse.json(
      { error: "Provide at least one assetId or brandColors." },
      { status: 400 }
    );
  }

  try {
    const analyzed = await analyzeAssets(ids, validBrandColors);
    return NextResponse.json(analyzed);
  } catch (e) {
    const { logServerError, sanitizeErrorMessage } = await import("@/lib/utils/error");
    logServerError("POST /api/assets/analyze", e);
    return NextResponse.json({ error: sanitizeErrorMessage(e) }, { status: 500 });
  }
}
