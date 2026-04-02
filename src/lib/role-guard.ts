import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { UserRole } from "@/lib/auth";

export async function requireRole(allowed: UserRole[]) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (!allowed.includes(session.user.role as UserRole)) {
    redirect("/dashboard");
  }

  return session.user;
}
