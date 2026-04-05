import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";
import { insertApiKey } from "@/lib/api-keys/service";

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured; API keys require Postgres." },
      { status: 503 }
    );
  }

  let userId: string | undefined;
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    userId = session?.user?.id != null ? String(session.user.id) : undefined;
  } catch {
    userId = undefined;
  }
  if (!userId) {
    return NextResponse.json({ error: "Sign in to create an API key." }, { status: 401 });
  }

  let label: string | undefined;
  try {
    const body = (await request.json()) as { label?: unknown };
    if (typeof body?.label === "string" && body.label.trim() !== "") {
      label = body.label.trim().slice(0, 120);
    }
  } catch {
  }

  try {
    const created = await insertApiKey(userId, label);
    return NextResponse.json({
      id: created.id,
      apiKey: created.fullKey,
      prefix: created.prefix,
      message:
        "Store this key securely; it is shown only once. Send it as header X-API-Key on /api/v1/generate requests.",
    });
  } catch (e) {
    console.error("[api-keys] create failed", e);
    return NextResponse.json({ error: "Could not create API key." }, { status: 500 });
  }
}
