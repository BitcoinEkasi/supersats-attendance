import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const proxy = auth((request) => {
  const session = request.auth;
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/login";

  if (!session && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (session && isLoginPage) {
    const role = session.user?.role as string;
    const dest = role === "MARSHALL" ? "/attendance" : "/dashboard";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  if (session) {
    const role = session.user?.role as string;

    // Participants section: ADMINISTRATOR only
    if (pathname.startsWith("/participants") && role !== "ADMINISTRATOR") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Attendance section: ADMINISTRATOR or MARSHAL
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
});

export const config = {
  matcher: ["/((?!api/auth|api/upload|_next/static|_next/image|favicon.ico|uploads).*)"],
};
