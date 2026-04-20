import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { TSK_GROUPS, TSK_GROUP_LABELS, type TskGroupKey } from "@/lib/tsk-groups";

export type UserRole = "ADMINISTRATOR" | "MARSHALL";

const ADMIN_USER = {
  id: "admin",
  name: process.env.ADMIN_NAME || "Administrator",
  username: process.env.ADMIN_USERNAME || "admin",
  password: process.env.ADMIN_PASSWORD || "",
  role: "ADMINISTRATOR" as UserRole,
  group: null as string | null,
};

const LEGACY_MARSHALL = {
  id: "marshall",
  name: process.env.MARSHALL_NAME || "Marshall",
  username: process.env.MARSHALL_USERNAME || "marshall",
  password: process.env.MARSHALL_PASSWORD || "",
  role: "MARSHALL" as UserRole,
  group: null as string | null,
};

// One Marshall account per group — authenticated by group id + passcode (no username)
const GROUP_MARSHALLS = TSK_GROUPS.map((g) => ({
  id: `marshall-${g.toLowerCase()}`,
  name: `${TSK_GROUP_LABELS[g]} Marshall`,
  username: g,
  password: process.env[`MARSHALL_PASSCODE_${g}`] || "",
  role: "MARSHALL" as UserRole,
  group: g as string | null,
}));

const USERS = [ADMIN_USER, LEGACY_MARSHALL, ...GROUP_MARSHALLS];

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const user = USERS.find((u) => u.username === credentials.username);
        if (!user || !user.password || user.password !== credentials.password) return null;

        return { id: user.id, name: user.name, role: user.role, group: user.group };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname.startsWith("/login");
      const isOnMarshall = nextUrl.pathname.startsWith("/marshall");

      if (isOnLogin || isOnMarshall) {
        if (isLoggedIn) {
          const role = (auth?.user as { role?: string })?.role;
          const dest = role === "MARSHALL" ? "/attendance" : "/dashboard";
          return Response.redirect(new URL(dest, nextUrl));
        }
        return true;
      }

      if (!isLoggedIn) return false;
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = (user as { role: UserRole }).role;
        token.group = (user as { group?: string | null }).group ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.group = (token.group as string | null) ?? null;
      }
      return session;
    },
  },
});
