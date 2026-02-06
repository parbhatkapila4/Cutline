import { interpretIntent } from "@/lib/pipeline/intent";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let body: { input?: unknown };
  try {
    body = (await request.json()) as { input?: unknown };
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body. Send { input: string }." },
      { status: 400 }
    );
  }

  const input = body.input;
  if (typeof input !== "string" || input.trim() === "") {
    return NextResponse.json(
      { error: "Missing or invalid 'input'. Send a non-empty string." },
      { status: 400 }
    );
  }

  try {
    const intent = await interpretIntent(input.trim());
    return NextResponse.json(intent);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Intent interpretation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
