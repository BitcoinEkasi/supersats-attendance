import { auth } from "@/lib/auth";
import type { UserRole } from "@/lib/auth";

type AuthUser = { id: string; name?: string | null; role: UserRole };

export async function requireAuth(allowedRoles?: UserRole[]): Promise<AuthUser | null> {
  const session = await auth();
  const user = session?.user;

  if (!user?.id) return null;

  if (allowedRoles && !allowedRoles.includes(user.role as UserRole)) return null;

  return user as AuthUser;
}
