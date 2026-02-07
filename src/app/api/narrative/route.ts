import { planNarrative } from "@/lib/pipeline/narrative";
import type { Intent } from "@/lib/types";
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

export async function POST(request: Request) {
  let body: { intent?: unknown };
  try {
    body = (await request.json()) as { intent?: unknown };
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body. Send { intent: Intent }." },
      { status: 400 }
    );
  }

  const intent = body.intent;
  if (!isIntent(intent)) {
    return NextResponse.json(
      {
        error:
          "Missing or invalid 'intent'. Send an Intent from Stage 1 (audience, goal, tone, complexity, durationSeconds, rawInput).",
      },
      { status: 400 }
    );
  }

  try {
    const plan = await planNarrative(intent);
    return NextResponse.json(plan);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Narrative planning failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
