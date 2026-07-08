import crypto from "crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { encryptionConfigured } from "@/lib/crypto";
import { buildAuthUrl, stravaConfigured } from "@/lib/integrations/strava";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", process.env.APP_URL));
  }
  if (!stravaConfigured() || !encryptionConfigured()) {
    return NextResponse.redirect(
      new URL("/integrations?error=config", process.env.APP_URL),
    );
  }

  const state = crypto.randomBytes(16).toString("hex");
  const res = NextResponse.redirect(buildAuthUrl(state));
  res.cookies.set("oauth_state_strava", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
