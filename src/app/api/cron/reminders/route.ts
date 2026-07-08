import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isCronAuthorized } from "@/lib/cronAuth";
import { sendEmail } from "@/lib/email";
import { typeLabel } from "@/lib/format";

export const maxDuration = 120;

/** Invia l'email con l'allenamento del giorno agli utenti con un piano attivo. */
async function handle(req: Request) {
  if (!(await isCronAuthorized(req))) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start.getTime() + 86400000);

  const workouts = await db.plannedWorkout.findMany({
    where: {
      date: { gte: start, lt: end },
      type: { not: "rest" },
      completed: false,
      plan: { status: "active" },
    },
    include: { plan: { include: { user: { select: { email: true, name: true } } } } },
  });

  let sent = 0;
  for (const w of workouts) {
    const email = w.plan.user.email;
    if (!email) continue;
    const ok = await sendEmail({
      to: email,
      subject: `Allenamento di oggi: ${w.title ?? typeLabel(w.type)} — RunnerAI`,
      html: `<p>Ciao ${w.plan.user.name ?? "runner"},</p>
<p>L'allenamento di oggi è: <b>${w.title ?? typeLabel(w.type)}</b> (${typeLabel(w.type)}).</p>
${w.description ? `<p>${w.description}</p>` : ""}
${w.targetDistanceKm ? `<p>Distanza: ${w.targetDistanceKm} km</p>` : ""}
<p><a href="${process.env.APP_URL || "http://localhost:3000"}/plan">Apri il piano</a></p>`,
    });
    if (ok) sent++;
  }

  return NextResponse.json({ ok: true, candidates: workouts.length, sent });
}

export const GET = handle;
export const POST = handle;
