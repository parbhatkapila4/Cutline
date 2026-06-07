import { Checkout } from "@dodopayments/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { dodoEnvironment } from "@/lib/payments/dodo";
import { isKnownProductId } from "@/lib/products";

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

  const productId = req.nextUrl.searchParams.get("productId");
  if (!isKnownProductId(productId)) {
    return NextResponse.json({ error: "Unknown or missing productId." }, { status: 400 });
  }

  const url = new URL(req.url);
  url.searchParams.set("metadata_userId", userId);
  if (email) url.searchParams.set("email", email);

  return staticCheckout(new NextRequest(url, { headers: req.headers }));
}
