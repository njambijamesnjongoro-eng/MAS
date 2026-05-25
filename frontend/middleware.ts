import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  try {
    const pathname = request.nextUrl.pathname;
    const refreshCookie = request.cookies.get("ehr_refresh");
    const hasSession = typeof refreshCookie?.value === "string" && refreshCookie.value.length > 0;
    const isProtected =
      pathname === "/dashboard" ||
      pathname.startsWith("/dashboard/") ||
      pathname === "/patients" ||
      pathname.startsWith("/patients/");

    if (pathname === "/login" && hasSession) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    if (isProtected && !hasSession) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  } catch {
    // Keep the app reachable even if the edge runtime fails unexpectedly.
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/dashboard/:path*", "/patients/:path*"],
};
