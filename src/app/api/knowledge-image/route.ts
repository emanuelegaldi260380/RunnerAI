import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { getOrCreateScienceImage } from "@/lib/services/scienceImage";

export const maxDuration = 60;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ path: null });
  const force = url.searchParams.get("force") === "1" && isAdminEmail(session.user.email);
  const path = await getOrCreateScienceImage(id, force);
  return NextResponse.json({ path });
}
