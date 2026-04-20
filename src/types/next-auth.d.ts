import type { DefaultSession } from "next-auth";
import type { UserRole } from "@/lib/auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      group?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    group?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    group?: string | null;
  }
}
