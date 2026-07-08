import type { NextAuthConfig } from "next-auth";

/**
 * Config edge-safe (senza bcrypt/prisma), usata dal middleware.
 * I provider veri sono aggiunti in src/auth.ts (runtime Node).
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  providers: [], // definiti in auth.ts
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;
      // rotte protette
      // NB: /press è pubblico (vetrina), non incluso qui
      const protectedPrefixes = ["/dashboard", "/activities", "/plan", "/profile", "/billing", "/integrations", "/knowledge", "/admin"];
      const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p));
      if (isProtected && !isLoggedIn) return false;
      return true;
    },
  },
} satisfies NextAuthConfig;
