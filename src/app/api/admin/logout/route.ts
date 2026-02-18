import { NextResponse } from "next/server";
import { getAdminSessionCookieName } from "@/lib/auth/admin";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const base = url.origin;
  const response = NextResponse.redirect(new URL("/admin", base));
  response.cookies.set(getAdminSessionCookieName(), "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
