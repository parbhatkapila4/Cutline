import { NextResponse } from "next/server";
import { DEFAULT_TEXT_MODEL } from "@/constants/landing";

export async function GET() {
  const defaultScriptModel =
    process.env.OPENROUTER_MODEL ?? DEFAULT_TEXT_MODEL;
  return NextResponse.json({ defaultScriptModel });
}
