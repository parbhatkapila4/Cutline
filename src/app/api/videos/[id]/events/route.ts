import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import { recordVideoUsage } from "@/lib/db/videoUsage";
import { resolveOwnerCandidates } from "@/lib/jobs/jobOwnership";
import { validateJobId } from "@/lib/validation/input";
import {
  CLIENT_VIDEO_USAGE_EVENT_TYPES,
  VIDEO_USAGE_SURFACES,
  isClientVideoUsageEventType,
  isVideoUsageSurface,
} from "@/lib/dashboard/videoUsageEvents";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!validateJobId(id).valid) {
    return NextResponse.json({ error: "Invalid video id" }, { status: 400 });
  }

  const [userId] = await resolveOwnerCandidates(request);
  if (!userId) {
    return NextResponse.json({ error: "Sign in required.", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  let body: { eventType?: unknown; surface?: unknown } | null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const eventType = body?.eventType;
  const surface = body?.surface;
  if (!isClientVideoUsageEventType(eventType)) {
    return NextResponse.json(
      { error: `eventType must be one of: ${CLIENT_VIDEO_USAGE_EVENT_TYPES.join(", ")}` },
      { status: 400 }
    );
  }
  if (!isVideoUsageSurface(surface)) {
    return NextResponse.json(
      { error: `surface must be one of: ${VIDEO_USAGE_SURFACES.join(", ")}` },
      { status: 400 }
    );
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  }

  const outcome = await recordVideoUsage({ jobId: id, userId, eventType, surface });
  if (outcome === "not_found") {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  if (outcome === "failed") {
    return NextResponse.json({ error: "Could not record the event" }, { status: 500 });
  }
  return new NextResponse(null, { status: 204 });
}
