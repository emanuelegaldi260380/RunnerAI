import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { consumeAuthToken } from "@/lib/authTokens";

export async function GET(req: Request) {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const userId = token ? await consumeAuthToken(token, "verify") : null;
  if (!userId) {
    return NextResponse.redirect(new URL("/login?verify=invalid", appUrl));
  }
  await db.user.update({
    where: { id: userId },
    data: { emailVerified: new Date() },
  });
  return NextResponse.redirect(new URL("/dashboard?verified=1", appUrl));
}
