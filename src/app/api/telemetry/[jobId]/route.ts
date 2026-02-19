import { NextResponse } from "next/server";
import { getJobTelemetry } from "@/lib/telemetry/store";
import { requireAdmin } from "@/lib/auth/admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const admin = requireAdmin(request);
  if (!admin.ok) {
    return NextResponse.json(admin.body, { status: admin.status });
  }
  try {
    const { jobId } = await params;
    const job = getJobTelemetry(jobId);
    if (!job) {
      return NextResponse.json(
        { error: "Job not found." },
        { status: 404 }
      );
    }
    return NextResponse.json(job);
  } catch (e) {
    console.error("[api] GET /api/telemetry/[jobId] error=" + (e instanceof Error ? e.message : String(e)));
    return NextResponse.json(
      { error: "Failed to fetch job telemetry." },
      { status: 500 }
    );
  }
}
