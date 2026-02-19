import { NextResponse } from "next/server";
import { getReadiness } from "@/lib/health/readiness";

export async function GET() {
  try {
    const { ok, checks } = await getReadiness();
    if (!ok) {
      return NextResponse.json(
        { status: "not_ready", checks },
        { status: 503 }
      );
    }
    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch {
    return NextResponse.json(
      { status: "not_ready", checks: { ready: "check failed" } },
      { status: 503 }
    );
  }
}
