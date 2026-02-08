import { planShots } from "@/lib/pipeline/shots";
import type { Intent, NarrativePlan } from "@/lib/types";
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

function isNarrativePlan(obj: unknown): obj is NarrativePlan {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) return false;
  const o = obj as Record<string, unknown>;
  if (typeof o.arc !== "string" || typeof o.rationale !== "string") return false;
  if (typeof o.totalDurationSeconds !== "number") return false;
  if (!Array.isArray(o.beats)) return false;
  for (const b of o.beats) {
    const beat = b as Record<string, unknown>;
    if (
      typeof beat.id !== "string" ||
      typeof beat.purpose !== "string" ||
      typeof beat.durationSeconds !== "number" ||
      (beat.pacing !== "fast" && beat.pacing !== "slow" && beat.pacing !== "steady")
    )
      return false;
  }
  return true;
}

export async function POST(request: Request) {
  let body: { intent?: unknown; plan?: unknown };
  try {
    body = (await request.json()) as { intent?: unknown; plan?: unknown };
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body. Send { intent: Intent, plan: NarrativePlan }." },
      { status: 400 }
    );
  }

  const intent = body.intent;
  const plan = body.plan;
  if (!isIntent(intent)) {
    return NextResponse.json(
      {
        error:
          "Missing or invalid 'intent'. Send an Intent from Stage 1.",
      },
      { status: 400 }
    );
  }
  if (!isNarrativePlan(plan)) {
    return NextResponse.json(
      {
        error:
          "Missing or invalid 'plan'. Send a NarrativePlan from Stage 2 (arc, beats, totalDurationSeconds, rationale).",
      },
      { status: 400 }
    );
  }

  try {
    const shotList = await planShots(intent, plan);
    return NextResponse.json(shotList);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Shot reasoning failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
