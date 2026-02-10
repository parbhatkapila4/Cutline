import { NextResponse } from "next/server";

const DEFAULT_SCRIPT_MODEL = "google/gemini-2.0-flash-lite-001";

export async function GET() {
  const defaultScriptModel =
    process.env.OPENROUTER_MODEL ?? DEFAULT_SCRIPT_MODEL;
  return NextResponse.json({ defaultScriptModel });
}
