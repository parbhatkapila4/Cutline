import { NextResponse } from "next/server";
import {
  getAdminSecret,
  createAdminSessionCookie,
  getAdminSessionCookieName,
} from "@/lib/auth/admin";
import { timingSafeEqual } from "crypto";

const SESSION_DURATION_SEC = 24 * 60 * 60;

export async function POST(request: Request) {
  const secret = getAdminSecret();
  if (!secret) {
    return NextResponse.json(
      { error: "Admin not configured" },
      { status: 401 }
    );
  }

  let body: { secret?: unknown };
  try {
    body = (await request.json()) as { secret?: unknown };
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const provided = typeof body.secret === "string" ? body.secret.trim() : "";
  if (!provided) {
    return NextResponse.json(
      { error: "Missing secret." },
      { status: 400 }
    );
  }

  const bufProvided = Buffer.from(provided, "utf8");
  const bufSecret = Buffer.from(secret, "utf8");
  if (bufProvided.length !== bufSecret.length) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!timingSafeEqual(bufProvided, bufSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookieValue = createAdminSessionCookie();
  if (!cookieValue) {
    return NextResponse.json(
      { error: "Admin not configured" },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(getAdminSessionCookieName(), cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION_SEC,
    path: "/",
  });
  return response;
}
