import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/login";

  if (!token && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (token && isLoginPage) {
    const role = token.role as string;
    const dest = role === "MARSHALL" ? "/attendance" : "/dashboard";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  if (token) {
    const role = token.role as string;

    // Participants section: ADMINISTRATOR only
    if (pathname.startsWith("/participants") && role !== "ADMINISTRATOR") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Attendance section: ADMINISTRATOR or MARSHALL
    if (
      pathname.startsWith("/attendance") &&
      role !== "ADMINISTRATOR" &&
      role !== "MARSHALL"
    ) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Reports section: ADMINISTRATOR only
    if (pathname.startsWith("/reports") && role !== "ADMINISTRATOR") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|api/upload|_next/static|_next/image|favicon.ico|uploads).*)"],
};
