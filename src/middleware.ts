import { NextRequest, NextResponse } from "next/server";

const PUBLIC = ["/login", "/api/auth/login", "/favicon.ico", "/logo.svg", "/logo.png"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith("/_next"))) {
    return NextResponse.next();
  }
  const session = req.cookies.get("mh_session")?.value;
  const hasClientSession = req.cookies.get("maxhals-forensics-v1")?.value;
  // Accept either the httpOnly auth cookie or the persisted client store session
  if (!session && !hasClientSession && !pathname.startsWith("/api")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
