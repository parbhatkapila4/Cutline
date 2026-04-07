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
    return NextResponse.json({ comments: [] });
  }
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT id, job_id, user_id, body, created_at
      FROM job_comments
      WHERE job_id = ${jobId}
      ORDER BY created_at ASC
    `;
    return NextResponse.json({ comments: rows });
  } catch (e) {
    console.error("[job-comments] GET", e);
    return NextResponse.json({ error: "Failed to load comments" }, { status: 500 });
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

  let body: { body?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const text = typeof body?.body === "string" ? body.body.trim() : "";
  if (text.length === 0 || text.length > 4000) {
    return NextResponse.json({ error: "body is required (max 4000 chars)" }, { status: 400 });
  }

  try {
    const sql = getSql();
    const rows = await sql`
      INSERT INTO job_comments (job_id, user_id, body)
      VALUES (${jobId}, ${userId}, ${text})
      RETURNING id, job_id, user_id, body, created_at
    `;
    const row = (rows as Record<string, unknown>[])[0];
    return NextResponse.json({ comment: row });
  } catch (e) {
    console.error("[job-comments] POST", e);
    return NextResponse.json({ error: "Failed to add comment" }, { status: 500 });
  }
}
