import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Next.js 16: convenzione "proxy" (ex middleware). Edge-safe: usa solo authConfig.
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  // esclude asset statici e le rotte di NextAuth
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp)).*)",
  ],
};
