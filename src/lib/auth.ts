import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { TSK_GROUPS, TSK_GROUP_LABELS, type TskGroupKey } from "@/lib/tsk-groups";

export type UserRole = "ADMINISTRATOR" | "MARSHAL";

const ADMIN_USER = {
  id: "admin",
  name: process.env.ADMIN_NAME || "Administrator",
  username: process.env.ADMIN_USERNAME || "admin",
  password: process.env.ADMIN_PASSWORD || "",
  role: "ADMINISTRATOR" as UserRole,
  group: null as string | null,
};

const LEGACY_MARSHAL = {
  id: "marshal",
  name: process.env.MARSHAL_NAME || "Marshal",
  username: process.env.MARSHAL_USERNAME || "marshal",
  password: process.env.MARSHAL_PASSWORD || "",
  role: "MARSHAL" as UserRole,
  group: null as string | null,
};

// One Marshal account per group — authenticated by group id + passcode (no username)
const GROUP_MARSHALS = TSK_GROUPS.map((g) => ({
  id: `marshal-${g.toLowerCase()}`,
  name: `${TSK_GROUP_LABELS[g]} Marshal`,
  username: g,
  password: process.env[`MARSHAL_PASSCODE_${g}`] || "",
  role: "MARSHAL" as UserRole,
  group: g as string | null,
}));

const USERS = [ADMIN_USER, LEGACY_MARSHAL, ...GROUP_MARSHALS];

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
        if (!user || !user.password || user.password.toLowerCase() !== (credentials.password as string).toLowerCase()) return null;

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
      const isOnMarshal = nextUrl.pathname.startsWith("/marshal");

      // /marshal is always accessible — handles its own auth
      if (isOnMarshal) return true;

      if (isOnLogin) {
        if (isLoggedIn) {
          const role = (auth?.user as { role?: string })?.role;
          const dest = role === "MARSHAL" ? "/attendance" : "/dashboard";
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
