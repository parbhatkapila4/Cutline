import { NextResponse } from "next/server";
import { getReadiness } from "@/lib/health/readiness";

export async function GET() {
  const { ok, checks } = await getReadiness();
  if (!ok) {
    return NextResponse.json(
      { status: "unhealthy", checks },
      { status: 503 }
    );
  }
  return NextResponse.json({ status: "ok" }, { status: 200 });
}
