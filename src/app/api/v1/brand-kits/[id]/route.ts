import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";
import { deleteBrandKit, getBrandKitForUser, updateBrandKit } from "@/lib/brand-kits/service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Ctx) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }
  const { id } = await context.params;
  let userId: string | undefined;
  try {
    const session = await auth.api.getSession({ headers: _request.headers });
    userId = session?.user?.id != null ? String(session.user.id) : undefined;
  } catch {
    userId = undefined;
  }
  if (!userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const kit = await getBrandKitForUser(userId, id);
  if (!kit) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({
    id: kit.id,
    name: kit.name,
    logoUrl: kit.logo_url,
    primaryColor: kit.primary_color,
    secondaryColor: kit.secondary_color,
    bannedPhrases: kit.banned_phrases,
    requiredPhrases: kit.required_phrases,
  });
}

export async function PATCH(request: Request, context: Ctx) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }
  const { id } = await context.params;
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

  const patch: Parameters<typeof updateBrandKit>[2] = {};
  if (typeof body.name === "string") patch.name = body.name.trim().slice(0, 120);
  if (body.logoUrl !== undefined) {
    patch.logoUrl = typeof body.logoUrl === "string" ? body.logoUrl.trim() || null : null;
  }
  if (body.primaryColor !== undefined) {
    patch.primaryColor = typeof body.primaryColor === "string" ? body.primaryColor.trim() || null : null;
  }
  if (body.secondaryColor !== undefined) {
    patch.secondaryColor = typeof body.secondaryColor === "string" ? body.secondaryColor.trim() || null : null;
  }
  if (Array.isArray(body.bannedPhrases)) {
    patch.bannedPhrases = body.bannedPhrases
      .filter((x): x is string => typeof x === "string")
      .slice(0, 24);
  }
  if (Array.isArray(body.requiredPhrases)) {
    patch.requiredPhrases = body.requiredPhrases
      .filter((x): x is string => typeof x === "string")
      .slice(0, 24);
  }

  const ok = await updateBrandKit(userId, id, patch);
  if (!ok) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: Ctx) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }
  const { id } = await context.params;
  let userId: string | undefined;
  try {
    const session = await auth.api.getSession({ headers: _request.headers });
    userId = session?.user?.id != null ? String(session.user.id) : undefined;
  } catch {
    userId = undefined;
  }
  if (!userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const ok = await deleteBrandKit(userId, id);
  if (!ok) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
