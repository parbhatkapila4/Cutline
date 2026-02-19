import { NextResponse } from "next/server";
import { listRecentJobs } from "@/lib/telemetry/store";
import { requireAdmin } from "@/lib/auth/admin";

export async function GET(request: Request) {
  const admin = requireAdmin(request);
  if (!admin.ok) {
    return NextResponse.json(admin.body, { status: admin.status });
  }
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(500, Math.max(1, parseInt(limitParam, 10) || 50)) : 50;
    const jobs = listRecentJobs(limit);
    return NextResponse.json({ jobs });
  } catch (e) {
    console.error("[api] GET /api/telemetry error=" + (e instanceof Error ? e.message : String(e)));
    return NextResponse.json(
      { error: "Failed to fetch telemetry." },
      { status: 500 }
    );
  }
}
