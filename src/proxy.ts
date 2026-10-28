import { trackAICrawlerRequest } from "@datafast/ai-crawl";
import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { DATAFAST_WEBSITE_ID } from "@/lib/analytics/datafast";
import { REQUEST_URL_HEADER } from "@/lib/http/requestUrl";

function requiresSignIn(pathname: string): boolean {
  return pathname === "/create" || pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  trackAICrawlerRequest(request, event, { websiteId: DATAFAST_WEBSITE_ID });

  if (!requiresSignIn(request.nextUrl.pathname)) return NextResponse.next();

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
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
