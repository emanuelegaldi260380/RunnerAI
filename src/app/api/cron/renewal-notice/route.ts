import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isCronAuthorized } from "@/lib/cronAuth";
import { sendEmail } from "@/lib/email";
import { fmtDate } from "@/lib/format";

export const maxDuration = 120;

/**
 * Preavviso di rinnovo automatico (art. 65-bis Cod. Consumo): invia un avviso
 * scritto e tracciabile (email) almeno 30 giorni prima della data di rinnovo,
 * una sola volta per periodo. Ricorda scadenza e modalità di disdetta.
 */
async function handle(req: Request) {
  if (!(await isCronAuthorized(req))) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 86400000);
  const appUrl = process.env.APP_URL || "http://localhost:3000";

  // Candidati: abbonamenti attivi, non già in disdetta, che si rinnovano entro 30 giorni.
  const subs = await db.subscription.findMany({
    where: {
      status: "active",
      cancelAtPeriodEnd: false,
      currentPeriodEnd: { gt: now, lte: in30 },
    },
    include: { user: { select: { email: true, name: true } } },
  });

  let sent = 0;
  for (const sub of subs) {
    const renewal = sub.currentPeriodEnd;
    if (!renewal) continue;
    // già inviato il preavviso per QUESTO rinnovo?
    if (sub.renewalNoticeFor && sub.renewalNoticeFor.getTime() === renewal.getTime()) {
      continue;
    }
    const email = sub.user.email;
    if (!email) continue;

    const ok = await sendEmail({
      to: email,
      subject: "Preavviso di rinnovo del tuo abbonamento — RunnerAI",
      html: `<p>Ciao ${sub.user.name ?? "runner"},</p>
<p>Ti ricordiamo che il tuo abbonamento a RunnerAI si <b>rinnoverà automaticamente il ${fmtDate(renewal)}</b>.</p>
<p>Se non desideri rinnovare, puoi <b>disdire in qualsiasi momento, in modo semplice e immediato</b>, senza costi aggiuntivi, dalla pagina <a href="${appUrl}/billing">Abbonamento</a> (funzione &quot;Disdici abbonamento&quot;).</p>
<p>Se non fai nulla, il rinnovo avverrà regolarmente alle condizioni in vigore.</p>
<p>— Il team di RunnerAI</p>`,
    });

    if (ok) {
      await db.subscription.update({
        where: { userId: sub.userId },
        data: { renewalNoticeSentAt: now, renewalNoticeFor: renewal },
      });
      sent++;
    }
  }

  return NextResponse.json({ ok: true, candidates: subs.length, sent });
}

export const GET = handle;
export const POST = handle;
