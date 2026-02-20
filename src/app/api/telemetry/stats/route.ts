import { NextResponse } from "next/server";
import { getAggregateStats } from "@/lib/telemetry/store";
import { requireAdmin } from "@/lib/auth/admin";

export async function GET(request: Request) {
  const admin = requireAdmin(request);
  if (!admin.ok) {
    return NextResponse.json(admin.body, { status: admin.status });
  }
  try {
    const stats = getAggregateStats();
    return NextResponse.json(stats);
  } catch (e) {
    console.error("[api] GET /api/telemetry/stats error=" + (e instanceof Error ? e.message : String(e)));
    return NextResponse.json(
      { error: "Failed to fetch stats." },
      { status: 500 }
    );
  }
}
