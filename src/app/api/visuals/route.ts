import { composeVisuals } from "@/lib/pipeline/visuals";
import type { Intent, ShotList } from "@/lib/types";
import { NextResponse } from "next/server";

function isIntent(obj: unknown): obj is Intent {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) return false;
  const o = obj as Record<string, unknown>;
  return (
    (o.audience === "broad" || o.audience === "technical" || o.audience === "casual") &&
    (o.goal === "explain" || o.goal === "persuade" || o.goal === "entertain") &&
    (o.tone === "serious" || o.tone === "playful" || o.tone === "urgent") &&
    (o.complexity === "simple" || o.complexity === "multi-part") &&
    typeof o.durationSeconds === "number" &&
    typeof o.rawInput === "string"
  );
}

function isShotList(obj: unknown): obj is ShotList {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) return false;
  const o = obj as Record<string, unknown>;
  if (typeof o.totalDurationSeconds !== "number") return false;
  if (!Array.isArray(o.shots)) return false;
  const purposeSet = new Set(["establish", "reveal", "emphasize", "transition", "hold"]);
  const motionSet = new Set([
    "static", "push", "pull", "pan-left", "pan-right", "zoom-in", "zoom-out", "cut",
  ]);
  const emotionSet = new Set(["tension", "release", "curiosity", "urgency", "calm", "neutral"]);
  for (const s of o.shots) {
    const shot = s as Record<string, unknown>;
    if (
      typeof shot.id !== "string" ||
      typeof shot.beatId !== "string" ||
      typeof shot.durationSeconds !== "number" ||
      !purposeSet.has(shot.purpose as string) ||
      !motionSet.has(shot.motionType as string) ||
      !emotionSet.has(shot.emotionalIntent as string) ||
      (shot.textDensity !== 0 && shot.textDensity !== 1 && shot.textDensity !== 2 && shot.textDensity !== 3) ||
      typeof shot.order !== "number"
    )
      return false;
  }
  return true;
}

export async function POST(request: Request) {
  let body: { intent?: unknown; shotList?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body. Send { intent: Intent, shotList: ShotList }." },
      { status: 400 }
    );
  }

  const intent = body.intent;
  const shotList = body.shotList;

  if (!isIntent(intent)) {
    return NextResponse.json(
      { error: "Missing or invalid 'intent'. Send an Intent from Stage 1." },
      { status: 400 }
    );
  }
  if (!isShotList(shotList)) {
    return NextResponse.json(
      { error: "Missing or invalid 'shotList'. Send a ShotList from Stage 3." },
      { status: 400 }
    );
  }

  try {
    const visualSpec = composeVisuals(intent, shotList);
    return NextResponse.json(visualSpec);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Visual composition failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
