import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserPlan } from "@/lib/users/planService";

export async function GET(request: Request) {
  let userId: string | undefined;
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    userId = session?.user?.id ? String(session.user.id) : undefined;
  } catch {
    userId = undefined;
  }
  if (!userId) {
    return NextResponse.json({ plan: "free", planLabel: "Free", authenticated: false });
  }
  const plan = await getUserPlan(userId);
  return NextResponse.json({ plan: plan.id, planLabel: plan.label, authenticated: true });
}
