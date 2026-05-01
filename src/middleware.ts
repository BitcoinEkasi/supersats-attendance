import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth((request) => {
  const session = request.auth;
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/login";
  const isMarshallPage = pathname.startsWith("/marshal");

  // /marshal is always accessible — handles its own auth
  if (isMarshallPage) return NextResponse.next();

  if (!session && isLoginPage) return NextResponse.next();

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const role = session.user?.role as string;

  // Logged-in users on login page get redirected away (marshal page stays accessible)
  if (isLoginPage) {
    const dest = role === "MARSHAL" ? "/attendance" : "/dashboard";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  // Participants section: ADMINISTRATOR only
  if (pathname.startsWith("/participants") && role !== "ADMINISTRATOR") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Attendance section: ADMINISTRATOR or MARSHAL
  if (
    pathname.startsWith("/attendance") &&
    role !== "ADMINISTRATOR" &&
    role !== "MARSHAL"
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Reports section: ADMINISTRATOR only
  if (pathname.startsWith("/reports") && role !== "ADMINISTRATOR") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|uploads).*)"],
};
