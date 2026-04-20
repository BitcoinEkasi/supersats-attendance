import { auth } from "@/lib/auth";
import type { UserRole } from "@/lib/auth";

type AuthUser = { id: string; name?: string | null; role: UserRole; group?: string | null };

export async function requireAuth(allowedRoles?: UserRole[]): Promise<AuthUser | null> {
  const session = await auth();
  const user = session?.user;

  if (!user?.id) return null;

  if (allowedRoles && !allowedRoles.includes(user.role as UserRole)) return null;

  return { id: user.id, name: user.name, role: user.role as UserRole, group: user.group ?? null };
}
