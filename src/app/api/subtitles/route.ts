import { generateSubtitles } from "@/lib/pipeline/subtitles";
import type { Script, ShotList } from "@/lib/types";
import { NextResponse } from "next/server";

function isScript(obj: unknown): obj is Script {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) return false;
  const o = obj as Record<string, unknown>;
  if (!Array.isArray(o.entries)) return false;
  for (const e of o.entries) {
    const entry = e as Record<string, unknown>;
    if (
      typeof entry.shotId !== "string" ||
      (entry.text !== null && typeof entry.text !== "string") ||
      typeof entry.order !== "number"
    )
      return false;
  }
  return true;
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
  let body: { script?: unknown; shotList?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body. Send { script: Script, shotList: ShotList }." },
      { status: 400 }
    );
  }

  const script = body.script;
  const shotList = body.shotList;

  if (!isScript(script)) {
    return NextResponse.json(
      { error: "Missing or invalid 'script'. Send a Script from Stage 4." },
      { status: 400 }
    );
  }
  if (!isShotList(shotList)) {
    return NextResponse.json(
      { error: "Missing or invalid 'shotList'. Send a ShotList from Stage 3." },
      { status: 400 }
    );
  }

  const track = generateSubtitles(script, shotList);
  return NextResponse.json(track);
}
