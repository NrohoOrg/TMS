import { NextRequest, NextResponse } from "next/server";

const ADMIN_PREFIX = "/admin";
const DISPATCHER_PREFIX = "/dispatcher";
const DRIVER_PREFIX = "/driver";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const role = req.cookies.get("tms_role")?.value;

  const requiresAuth =
    pathname.startsWith(ADMIN_PREFIX) ||
    pathname.startsWith(DISPATCHER_PREFIX) ||
    pathname.startsWith(DRIVER_PREFIX);
  if (!requiresAuth) return NextResponse.next();

  // Without a role cookie we let the client-side AuthProvider handle the redirect to /login.
  // This keeps middleware non-blocking on first hit when the cookie hasn't been written yet.
  if (!role) return NextResponse.next();

  const can = (allowed: string[]) => allowed.includes(role);

  if (pathname.startsWith(ADMIN_PREFIX) && !can(["ADMIN"])) {
    return NextResponse.redirect(new URL(homeForRole(role), req.url));
  }
  if (pathname.startsWith(DISPATCHER_PREFIX) && !can(["ADMIN", "DISPATCHER"])) {
    return NextResponse.redirect(new URL(homeForRole(role), req.url));
  }
  if (pathname.startsWith(DRIVER_PREFIX) && !can(["DRIVER", "ADMIN"])) {
    return NextResponse.redirect(new URL(homeForRole(role), req.url));
  }

  return NextResponse.next();
}

function homeForRole(role: string): string {
  if (role === "ADMIN") return "/admin";
  if (role === "DISPATCHER") return "/dispatcher";
  if (role === "DRIVER") return "/driver";
  return "/login";
}

export const config = {
  matcher: ["/admin/:path*", "/dispatcher/:path*", "/driver/:path*"],
};
