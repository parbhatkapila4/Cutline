import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifyAndUpgrade } from "@/lib/payments/verify";

export async function POST(request: Request) {
  let userId: string | undefined;
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    userId = session?.user?.id ? String(session.user.id) : undefined;
  } catch {
    userId = undefined;
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { sessionId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.sessionId || typeof body.sessionId !== "string") {
    return NextResponse.json({ error: "Missing checkout session ID." }, { status: 400 });
  }

  try {
    const result = await verifyAndUpgrade(body.sessionId);
    if (result.success) {
      return NextResponse.json({ success: true, plan: result.plan });
    }
    return NextResponse.json({ success: false, reason: result.reason }, { status: 400 });
  } catch (err) {
    console.error("[checkout/verify] Error verifying payment:", err);
    return NextResponse.json(
      { error: "Payment verification failed. Please contact support if the issue persists." },
      { status: 500 },
    );
  }
}
