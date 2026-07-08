import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectFromCode } from "@/lib/integrations/strava";

export async function GET(req: Request) {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", appUrl));
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/integrations?error=denied", appUrl));
  }

  // verifica CSRF via cookie di stato
  const cookieState = req.headers
    .get("cookie")
    ?.match(/oauth_state_strava=([^;]+)/)?.[1];
  if (!state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(new URL("/integrations?error=state", appUrl));
  }

  try {
    await connectFromCode(session.user.id, code);
  } catch {
    return NextResponse.redirect(new URL("/integrations?error=exchange", appUrl));
  }

  const res = NextResponse.redirect(
    new URL("/integrations?connected=strava", appUrl),
  );
  res.cookies.set("oauth_state_strava", "", { path: "/", maxAge: 0 });
  return res;
}
