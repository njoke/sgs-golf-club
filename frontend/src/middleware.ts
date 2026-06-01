import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_PATHS = ["/dashboard", "/manage", "/tournaments"];
const MEMBER_PATHS = ["/member"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("sgs_token")?.value;
  const isAdminPath = ADMIN_PATHS.some((item) => pathname.startsWith(item));
  const isMemberPath = MEMBER_PATHS.some((item) => pathname.startsWith(item));

  if ((isAdminPath || isMemberPath) && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/manage/:path*", "/tournaments/:path*", "/member/:path*"],
};
