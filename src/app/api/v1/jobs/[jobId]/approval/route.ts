import { NextResponse } from "next/server";
import { getSql, isDatabaseConfigured } from "@/lib/db";
import { validateJobId } from "@/lib/validation/input";
import { auth } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const v = validateJobId(jobId);
  if (!v.valid) {
    return NextResponse.json({ error: "Invalid job id" }, { status: 400 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ approval: null });
  }
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT job_id, status, actor_user_id, updated_at
      FROM job_approvals
      WHERE job_id = ${jobId}
      LIMIT 1
    `;
    const row = (rows as Record<string, unknown>[])[0] ?? null;
    return NextResponse.json({ approval: row });
  } catch (e) {
    console.error("[job-approval] GET", e);
    return NextResponse.json({ error: "Failed to load approval" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const v = validateJobId(jobId);
  if (!v.valid) {
    return NextResponse.json({ error: "Invalid job id" }, { status: 400 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured." },
      { status: 503 }
    );
  }

  let userId: string | null = null;
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    userId = session?.user?.id != null ? String(session.user.id) : null;
  } catch {
    userId = null;
  }

  let body: { status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const status = typeof body?.status === "string" ? body.status.trim() : "";
  if (status !== "approved" && status !== "rejected" && status !== "pending") {
    return NextResponse.json(
      { error: 'status must be "pending", "approved", or "rejected"' },
      { status: 400 }
    );
  }

  try {
    const sql = getSql();
    await sql`
      INSERT INTO job_approvals (job_id, status, actor_user_id)
      VALUES (${jobId}, ${status}, ${userId})
      ON CONFLICT (job_id) DO UPDATE SET
        status = EXCLUDED.status,
        actor_user_id = EXCLUDED.actor_user_id,
        updated_at = now()
    `;
    return NextResponse.json({ jobId, status });
  } catch (e) {
    console.error("[job-approval] POST", e);
    return NextResponse.json({ error: "Failed to record approval" }, { status: 500 });
  }
}
