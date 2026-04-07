import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStripe, PURCHASABLE_PLANS } from "@/lib/stripe";
import { getSql, isDatabaseConfigured } from "@/lib/db";
import { getUserPlan } from "@/lib/users/planService";

export async function POST(request: Request) {
  let userId: string | undefined;
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    userId = session?.user?.id ? String(session.user.id) : undefined;
  } catch {
    userId = undefined;
  }

  if (!userId) {
    return NextResponse.json(
      { error: "Please sign in to purchase a plan.", code: "AUTH_REQUIRED" },
      { status: 401 },
    );
  }

  let body: { planId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const planId = body.planId;
  if (!planId || !(planId in PURCHASABLE_PLANS)) {
    return NextResponse.json({ error: "Invalid plan selected." }, { status: 400 });
  }

  const currentPlan = await getUserPlan(userId);
  if (currentPlan.id === planId) {
    return NextResponse.json(
      { error: `You are already on the ${currentPlan.label} plan.` },
      { status: 409 },
    );
  }

  const planConfig = PURCHASABLE_PLANS[planId];
  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Cutline ${planConfig.label} Plan`,
            description: `${planConfig.label} plan — AI video generation`,
          },
          unit_amount: planConfig.amountCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId,
      planId,
    },
    success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/pricing`,
  });

  if (isDatabaseConfigured()) {
    const sql = getSql();
    await sql`
      INSERT INTO payments (user_id, plan, amount_cents, currency, stripe_checkout_session_id, status)
      VALUES (${userId}, ${planId}, ${planConfig.amountCents}, 'usd', ${session.id}, 'pending')
    `;
  }

  return NextResponse.json({ url: session.url });
}
