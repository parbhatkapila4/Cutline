import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { REQUEST_URL_HEADER } from "@/lib/http/requestUrl";

export default function proxy(request: NextRequest) {
  const requestedPath = request.nextUrl.pathname + request.nextUrl.search;

  if (!getSessionCookie(request)) {
    const signIn = request.nextUrl.clone();
    signIn.pathname = "/auth/sign-in";
    signIn.search = "";
    signIn.searchParams.set("redirect", requestedPath);
    return NextResponse.redirect(signIn);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_URL_HEADER, requestedPath);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/create", "/dashboard/:path*"],
};
