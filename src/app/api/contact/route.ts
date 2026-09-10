import { NextResponse } from "next/server";
import { getClientIdentifier, checkRateLimit } from "@/lib/rate-limit";
import { validateContactSubmission } from "@/lib/contact/validation";
import { storeContactSubmission, markContactEmailStatus } from "@/lib/contact/service";
import { sendContactEmail, isContactEmailConfigured } from "@/lib/contact/email";
import { isDatabaseConfigured } from "@/lib/db/client";

export async function POST(request: Request) {
  const identifier = getClientIdentifier(request);
  const limit = await checkRateLimit(identifier, "contact");
  if (!limit.allowed) {
    const retryAfter = limit.retryAfter ?? 3600;
    return NextResponse.json(
      { error: "Too many messages from this network. Please try again later.", retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  let body: Record<string, unknown>;
  try {
    const raw: unknown = await request.json();
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    body = raw as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const honeypot = typeof body.website === "string" ? body.website.trim() : "";
  if (honeypot) {
    console.warn("[api] POST /api/contact honeypot triggered", { identifier });
    return NextResponse.json({ ok: true, stored: false, emailed: false });
  }

  const parsed = validateContactSubmission(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.errors[0] ?? "Invalid submission.", errors: parsed.errors },
      { status: 400 }
    );
  }
  const input = parsed.value;

  if (!isDatabaseConfigured() && !isContactEmailConfigured()) {
    console.error(
      "[api] POST /api/contact has no delivery channel: DATABASE_URL and RESEND_API_KEY are both unset"
    );
    return NextResponse.json(
      { error: "Contact form is not configured. Please email us directly." },
      { status: 503 }
    );
  }

  let submissionId: string | null = null;
  try {
    submissionId = await storeContactSubmission(input, identifier);
  } catch (e) {
    console.error("[api] POST /api/contact failed to store submission", e);
  }

  const email = await sendContactEmail(input, submissionId);
  if (!email.sent) {
    console.error("[api] POST /api/contact failed to send email", {
      reason: email.reason,
      submissionId,
      from: input.email,
    });
  }

  if (submissionId) {
    try {
      await markContactEmailStatus(
        submissionId,
        email.sent ? "sent" : "failed",
        email.sent
          ? { messageId: email.messageId }
          : { error: email.reason }
      );
    } catch (e) {
      console.error("[api] POST /api/contact failed to record email status", e);
    }
  }

  const stored = submissionId !== null;
  if (!email.sent) {
    return NextResponse.json(
      {
        error: stored
          ? "We saved your message but could not deliver it right now. Please email us directly so we don't miss you."
          : "We could not deliver your message. Please email us directly.",
        stored,
        emailed: false,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, stored, emailed: true });
}
