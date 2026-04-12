import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";
import { insertBrandKit, listBrandKits } from "@/lib/brand-kits/service";

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }
  let userId: string | undefined;
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    userId = session?.user?.id != null ? String(session.user.id) : undefined;
  } catch {
    userId = undefined;
  }
  if (!userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const kits = await listBrandKits(userId);
  return NextResponse.json({
    kits: kits.map((k) => ({
      id: k.id,
      name: k.name,
      logoUrl: k.logo_url,
      primaryColor: k.primary_color,
      secondaryColor: k.secondary_color,
      bannedPhrases: k.banned_phrases,
      requiredPhrases: k.required_phrases,
    })),
  });
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }
  let userId: string | undefined;
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    userId = session?.user?.id != null ? String(session.user.id) : undefined;
  } catch {
    userId = undefined;
  }
  if (!userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 1 || name.length > 120) {
    return NextResponse.json({ error: "name is required (1–120 characters)." }, { status: 400 });
  }
  const banned = Array.isArray(body.bannedPhrases)
    ? body.bannedPhrases.filter((x): x is string => typeof x === "string").slice(0, 24)
    : [];
  const required = Array.isArray(body.requiredPhrases)
    ? body.requiredPhrases.filter((x): x is string => typeof x === "string").slice(0, 24)
    : [];

  try {
    const created = await insertBrandKit(userId, {
      name,
      logoUrl: typeof body.logoUrl === "string" ? body.logoUrl.trim() || null : null,
      primaryColor: typeof body.primaryColor === "string" ? body.primaryColor.trim() || null : null,
      secondaryColor: typeof body.secondaryColor === "string" ? body.secondaryColor.trim() || null : null,
      bannedPhrases: banned,
      requiredPhrases: required,
    });
    return NextResponse.json({ id: created.id });
  } catch (e) {
    console.error("[brand-kits] create", e);
    return NextResponse.json({ error: "Could not create brand kit." }, { status: 500 });
  }
}
