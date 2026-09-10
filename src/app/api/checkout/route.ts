import { Checkout } from "@dodopayments/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { dodoEnvironment } from "@/lib/payments/dodo";
import { isKnownProductId, isTopupProductId } from "@/lib/products";
import { getUserPlan } from "@/lib/users/planService";
import { isProPlan } from "@/lib/plans";

const staticCheckout = Checkout({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY,
  returnUrl: process.env.DODO_PAYMENTS_RETURN_URL,
  environment: dodoEnvironment(),
  type: "static",
});

export async function GET(req: NextRequest) {
  let userId: string | undefined;
  let email: string | undefined;
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    userId = session?.user?.id ? String(session.user.id) : undefined;
    email = session?.user?.email ?? undefined;
  } catch {
    userId = undefined;
  }
  if (!userId) {
    return NextResponse.json(
      { error: "Please sign in to continue.", code: "AUTH_REQUIRED" },
      { status: 401 },
    );
  }

  const productIds = req.nextUrl.searchParams.getAll("productId");
  if (productIds.length > 1) {
    return NextResponse.json({ error: "Exactly one productId is required." }, { status: 400 });
  }
  const productId = productIds[0] ?? null;

  if (isTopupProductId(productId)) {
    const plan = await getUserPlan(userId);
    if (!isProPlan(plan.id)) {
      return NextResponse.json(
        {
          error:
            "Extra seconds are an add-on to the Professional plan. Upgrade first, then top up.",
          code: "PLAN_REQUIRED",
          requiredPlan: "professional",
        },
        { status: 403 },
      );
    }
  } else if (!isKnownProductId(productId)) {
    return NextResponse.json({ error: "Unknown or missing productId." }, { status: 400 });
  }

  const url = new URL(req.url);
  url.searchParams.delete("quantity");
  url.searchParams.set("metadata_userId", userId);
  if (email) url.searchParams.set("email", email);

  return staticCheckout(new NextRequest(url, { headers: req.headers }));
}
