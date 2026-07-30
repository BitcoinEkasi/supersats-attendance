import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth((request) => {
  const session = request.auth;
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/login";
  const isMarshallPage = pathname.startsWith("/marshal");
  const isChartSnapshot = pathname.startsWith("/chart-snapshot");

  // /marshal is always accessible — handles its own auth.
  // /chart-snapshot is internal-only (headless-browser screenshot target for the TSK
  // Attendance email) — no session exists to check here, it gates on a bearer secret itself.
  if (isMarshallPage || isChartSnapshot) return NextResponse.next();

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
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|uploads|.*\\.json$|.*-sw\\.js$|icons/).*)"],
};
