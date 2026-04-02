import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export type UserRole = "ADMINISTRATOR" | "MARSHALL";

const USERS = [
  {
    id: "admin",
    name: process.env.ADMIN_NAME || "Administrator",
    username: process.env.ADMIN_USERNAME || "admin",
    password: process.env.ADMIN_PASSWORD || "",
    role: "ADMINISTRATOR" as UserRole,
  },
  {
    id: "marshall",
    name: process.env.MARSHALL_NAME || "Marshall",
    username: process.env.MARSHALL_USERNAME || "marshall",
    password: process.env.MARSHALL_PASSWORD || "",
    role: "MARSHALL" as UserRole,
  },
];

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
        if (!user || user.password !== credentials.password) return null;

        return { id: user.id, name: user.name, role: user.role };
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

      if (isOnLogin) {
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
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
  },
});
