import { CustomerPortal } from "@dodopayments/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { dodoEnvironment, getDodoCustomerId } from "@/lib/payments/dodo";

const portal = CustomerPortal({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY!,
  environment: dodoEnvironment(),
});

export async function GET(req: NextRequest) {
  let userId: string | undefined;
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    userId = session?.user?.id ? String(session.user.id) : undefined;
  } catch {
    userId = undefined;
  }
  if (!userId) {
    return NextResponse.redirect(new URL("/auth/sign-in", req.url));
  }

  const customerId = await getDodoCustomerId(userId);
  if (!customerId) {
    return NextResponse.redirect(new URL("/pricing", req.url));
  }

  const url = new URL(req.url);
  url.searchParams.set("customer_id", customerId);
  return portal(new NextRequest(url, { headers: req.headers }));
}
