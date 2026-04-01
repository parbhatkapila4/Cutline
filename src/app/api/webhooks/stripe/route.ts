import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { verifyAndUpgrade } from "@/lib/payments/verify";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const stripe = getStripe();
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    try {
      const result = await verifyAndUpgrade(session.id);
      if (!result.success) {
        console.error("[stripe-webhook] Plan upgrade failed for session", session.id, result.reason);
      } else {
        console.log(
          "[stripe-webhook] Plan upgraded:",
          session.metadata?.userId,
          "→",
          result.plan,
          result.alreadyProcessed ? "(already processed)" : "",
        );
      }
    } catch (err) {
      console.error("[stripe-webhook] Error processing checkout.session.completed:", err);
      return NextResponse.json({ error: "Processing error." }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
