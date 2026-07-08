import { db } from "@/lib/db";
import {
  buildUserProvider,
  configuredProviders,
  getPlanRoles,
  getProvider,
  isProviderConfigured,
  type ProviderName,
} from "@/lib/llm";
import { decrypt } from "@/lib/crypto";
import { fmtDate, fmtDistance, fmtDuration, fmtPace, typeLabel } from "@/lib/format";
import { formatKnowledgeContext, retrieveRelevant } from "./knowledge";
import { effectiveLlmCount } from "@/lib/plans";
import { pregenerateExerciseImages } from "./exerciseImage";

const PLAN_HORIZON_DAYS = 14;

interface WorkoutDraft {
  date?: string;
  type: string;
  title?: string;
  description?: string;
  targetDistanceKm?: number;
  targetPaceMinSec?: number;
  targetPaceMaxSec?: number;
  targetHrZone?: string;
  structure?: unknown;
  exercises?: { name: string; detail?: string; reps?: string }[];
}

interface PlanDraft {
  title?: string;
  rationale?: string;
  workouts: WorkoutDraft[];
}

// ---------------------------------------------------------------------------
// Contesto atleta
// ---------------------------------------------------------------------------

async function buildContext(userId: string) {
  const today0 = new Date();
  today0.setHours(0, 0, 0, 0);
  const [profile, activities, races, offDays] = await Promise.all([
    db.athleteProfile.findUnique({ where: { userId } }),
    db.activity.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 20,
    }),
    db.raceGoal.findMany({
      where: { userId, status: "planned" },
      orderBy: [{ priority: "asc" }, { raceDate: "asc" }],
    }),
    db.offDay.findMany({
      where: { userId, date: { gte: today0 } },
      orderBy: { date: "asc" },
    }),
  ]);

  const offBlock = offDays.length
    ? "GIORNI OFF (l'atleta NON è disponibile: assegna SEMPRE type \"rest\" in queste date):\n" +
      offDays.map((o) => `- ${o.date.toISOString().slice(0, 10)}`).join("\n")
    : "";

  const goals = (profile?.goals as Record<string, unknown> | null) ?? null;
  const prefs = (profile?.preferences as Record<string, unknown> | null) ?? null;
  const hrZones =
    (profile?.hrZones as Record<string, { min?: number; max?: number }> | null) ??
    null;

  const totalKm = activities.reduce((s, a) => s + (a.distanceKm ?? 0), 0);

  // gara principale: priorità più alta / data più vicina
  const primaryRace = races[0] ?? null;

  const racesBlock = races.length
    ? [
        "GARE OBIETTIVO (usa la principale come target del piano):",
        ...races.map(
          (r) =>
            `- [${r.priority}] ${r.name}: ${r.distanceKm} km${
              r.raceDate ? `, ${r.raceDate.toISOString().slice(0, 10)}` : ""
            }${r.targetTimeSec ? `, obiettivo ${fmtDuration(r.targetTimeSec)}` : ""}`,
        ),
      ].join("\n")
    : "";

  const crossTraining = Array.isArray(prefs?.crossTraining)
    ? (prefs!.crossTraining as string[])
    : [];
  const otherSports = (prefs?.otherSports as string | undefined) ?? null;
  const crossBlock =
    crossTraining.length || otherSports
      ? [
          "ATTIVITÀ COMPLEMENTARI DA INTEGRARE NEL PIANO:",
          otherSports ? `- Altri sport praticati dall'atleta: ${otherSports}` : "",
          crossTraining.length
            ? `- Integra sedute di: ${crossTraining.join(", ")}. Inseriscile in modo bilanciato col carico di corsa (usa type "cross" con descrizione dettagliata), a supporto degli obiettivi e per prevenire infortuni.`
            : "",
        ]
          .filter(Boolean)
          .join("\n")
      : "";

  const hrZonesBlock = hrZones
    ? "ZONE CARDIACHE PERSONALI (bpm) — calibra i target FC su questi valori:\n" +
      (["z1", "z2", "z3", "z4", "z5"] as const)
        .map((z) => {
          const v = hrZones[z];
          return v && (v.min || v.max)
            ? `- ${z.toUpperCase()}: ${v.min ?? "?"}–${v.max ?? "?"} bpm`
            : null;
        })
        .filter(Boolean)
        .join("\n")
    : "";

  const brief = [
    "PROFILO ATLETA:",
    `- Sesso: ${profile?.sex ?? "n/d"}, Livello: ${profile?.experience ?? "n/d"}`,
    `- FC riposo: ${profile?.restingHr ?? "n/d"}, FC max: ${profile?.maxHr ?? "n/d"}`,
    `- Volume settimanale dichiarato: ${profile?.weeklyVolumeKm ?? "n/d"} km`,
    `- Giorni/settimana preferiti: ${prefs?.daysPerWeek ?? "n/d"}`,
    "",
    racesBlock ||
      (goals
        ? `OBIETTIVO:\n- Distanza gara: ${goals.raceDistanceKm ?? "n/d"} km, Tempo target: ${
            goals.targetTimeSec ? fmtDuration(Number(goals.targetTimeSec)) : "n/d"
          }, Data: ${goals.raceDate ?? "n/d"}`
        : "OBIETTIVO:\n- Nessun obiettivo specifico impostato (proponi un obiettivo ragionevole di miglioramento generale)"),
    hrZonesBlock ? "\n" + hrZonesBlock : "",
    crossBlock ? "\n" + crossBlock : "",
    offBlock ? "\n" + offBlock : "",
    "",
    `STORICO ULTIMI ${activities.length} ALLENAMENTI (volume totale ${totalKm.toFixed(1)} km):`,
    ...activities.map(
      (a) =>
        `- ${fmtDate(a.date)}: ${typeLabel(a.type)} ${fmtDistance(
          a.distanceKm,
        )} in ${fmtDuration(a.durationSec)} @ ${fmtPace(
          a.avgPaceSecPerKm,
        )}${a.avgHr ? `, FC ${a.avgHr}` : ""}`,
    ),
  ].join("\n");

  const goalQuery = primaryRace
    ? `allenamento corsa ${primaryRace.distanceKm}km obiettivo ${profile?.experience ?? ""}`
    : goals
      ? `allenamento corsa ${goals.raceDistanceKm}km obiettivo ${profile?.experience ?? ""}`
      : `allenamento corsa personalizzato ${profile?.experience ?? "runner"}`;

  const llmPref =
    typeof prefs?.llmCount === "number" ? (prefs.llmCount as number) : null;

  return { profile, activities, brief, goalQuery, llmPref };
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

function proposalSystem() {
  return `Sei un coach di corsa di livello mondiale con solide basi nella scienza dell'allenamento (fisiologia, periodizzazione, gestione del carico, prevenzione infortuni).
Progetti piani personalizzati, sicuri e progressivi. Usi le fonti scientifiche fornite quando pertinenti.`;
}

function proposalUserPrompt(
  brief: string,
  knowledge: string,
  today: string,
) {
  return `Data odierna: ${today}.
Progetta i prossimi ${PLAN_HORIZON_DAYS} giorni di allenamento per questo atleta.

${brief}

FONTI SCIENTIFICHE DISPONIBILI:
${knowledge}

Restituisci SOLO un oggetto JSON con questo schema:
{
  "title": "titolo del blocco di allenamento",
  "rationale": "breve razionale (2-4 frasi) delle scelte",
  "workouts": [
    {
      "date": "yyyy-mm-dd",
      "type": "easy|long|tempo|interval|recovery|rest|race|cross",
      "title": "es. Ripetute 6x1000m",
      "description": "descrizione completa e istruzioni",
      "targetDistanceKm": number|null,
      "targetPaceMinSec": number|null,   // passo target min sec/km
      "targetPaceMaxSec": number|null,
      "targetHrZone": "es. Z2"|null,
      "structure": { "warmupKm": number, "main": "...", "cooldownKm": number }|null,
      "exercises": [{ "name": "es. Skip A", "detail": "esecuzione", "reps": "3x20m" }]|null
    }
  ]
}
Includi un allenamento per ciascuno dei prossimi ${PLAN_HORIZON_DAYS} giorni (usa type "rest" per i giorni di riposo).
Per le sedute con esercizi specifici (forza, pliometria, ginnastica, cross-training) popola "exercises" con i singoli esercizi (nome breve e chiaro, così da poterne mostrare un'immagine dimostrativa). Sii concreto sui ritmi in base allo storico.`;
}

function supervisorSystem() {
  return `Sei il coach capo che supervisiona due proposte di piano di allenamento redatte da altri due coach AI.
Il tuo compito: valutare criticamente entrambe (sicurezza, progressione del carico, aderenza all'obiettivo e allo storico, varietà, realismo dei ritmi), poi produrre il piano FINALE ottimale, prendendo il meglio delle due e correggendo gli errori.`;
}

function supervisorUserPrompt(
  brief: string,
  knowledge: string,
  today: string,
  proposalA: unknown,
  proposalB: unknown | null,
) {
  const proposalsBlock = proposalB
    ? `PROPOSTA A:\n${JSON.stringify(proposalA)}\n\nPROPOSTA B:\n${JSON.stringify(proposalB)}\n\nValuta le DUE proposte, prendi il meglio e correggi gli errori.`
    : `PROPOSTA DA REVISIONARE:\n${JSON.stringify(proposalA)}\n\nValuta criticamente questa proposta (sicurezza, progressione, ritmi, aderenza a obiettivo e storico) e MIGLIORALA.`;
  return `Data odierna: ${today}.

${brief}

FONTI SCIENTIFICHE:
${knowledge}

${proposalsBlock}

Genera il PIANO FINALE per i prossimi ${PLAN_HORIZON_DAYS} giorni.
Restituisci SOLO un oggetto JSON con lo stesso schema delle proposte (title, rationale, workouts[]).
Nel campo "rationale" spiega in 2-4 frasi cosa hai migliorato/corretto.`;
}

// ---------------------------------------------------------------------------
// Selezione ruoli (robusta alla configurazione)
// ---------------------------------------------------------------------------

function resolveRoles(): {
  proposerA: ProviderName;
  proposerB: ProviderName;
  supervisor: ProviderName;
} | null {
  const configured = configuredProviders();
  if (configured.length === 0) return null;

  const roles = getPlanRoles();
  const pick = (preferred: ProviderName, exclude: ProviderName[] = []) =>
    isProviderConfigured(preferred) && !exclude.includes(preferred)
      ? preferred
      : configured.find((p) => !exclude.includes(p)) ?? configured[0];

  const proposerA = pick(roles.proposerA);
  const proposerB = pick(roles.proposerB, [proposerA]) ?? proposerA;
  const supervisor = pick(roles.supervisor, [proposerA, proposerB]) ??
    pick(roles.supervisor, [proposerA]) ??
    proposerA;

  return { proposerA, proposerB, supervisor };
}

// ---------------------------------------------------------------------------
// Generazione
// ---------------------------------------------------------------------------

export interface GenerateResult {
  planId: string;
  engine: "multi-llm" | "mock";
}

const LANG_NAME: Record<string, string> = {
  it: "italiano",
  en: "inglese",
  es: "spagnolo",
};

export async function generatePlan(
  userId: string,
  customPrompt?: string | null,
  lang: string = "it",
): Promise<GenerateResult> {
  const { brief: baseBrief, goalQuery, llmPref } = await buildContext(userId);
  const langLine =
    lang && lang !== "it"
      ? `IMPORTANTE: scrivi TUTTI i testi del piano (title, description, nomi degli esercizi, rationale) in ${LANG_NAME[lang] ?? lang}.\n\n`
      : "";
  const brief =
    langLine +
    (customPrompt?.trim()
      ? `ISTRUZIONI PERSONALIZZATE DELL'UTENTE (PRIORITARIE — prevalgono in caso di conflitto con lo storico o i default):\n${customPrompt.trim()}\n\n${baseBrief}`
      : baseBrief);
  const snippets = await retrieveRelevant(goalQuery, 6);
  const knowledge = formatKnowledgeContext(snippets);
  const today = new Date().toISOString().slice(0, 10);

  const sys = proposalSystem();
  const userPrompt = proposalUserPrompt(brief, knowledge, today);

  // --- BYOK: l'utente usa la propria chiave/modello LLM ---
  const userLlm = await db.userLlmConfig.findUnique({ where: { userId } });
  if (userLlm?.enabled && userLlm.apiKeyEnc) {
    try {
      const key = decrypt(userLlm.apiKeyEnc);
      const prov = buildUserProvider(
        userLlm.provider as ProviderName,
        key,
        userLlm.model,
      );
      const plan = await prov.chatJSON<PlanDraft>({
        system: sys,
        messages: [{ role: "user", content: userPrompt }],
        maxTokens: 8000,
      });
      return persistPlan(
        userId,
        plan,
        [
          {
            role: "PROPOSER_A",
            provider: userLlm.provider,
            model: userLlm.model,
            content: plan,
          },
        ],
        "multi-llm",
      );
    } catch {
      // chiave utente non valida -> fallback alle chiavi RunnerAI
    }
  }

  const roles = resolveRoles();

  // Nessun provider configurato -> piano mock (skeleton demo)
  if (!roles) {
    return persistPlan(userId, mockPlan(today), [], "mock");
  }

  // numero di LLM: preferenza utente, limitata dal tier e dai provider disponibili
  const configured = configuredProviders().length;
  const { count: tierCount } = await effectiveLlmCount(userId, llmPref);
  const count = Math.max(1, Math.min(tierCount, configured));

  const provA = getProvider(roles.proposerA);

  // --- 1 LLM: genera direttamente il piano ---
  if (count <= 1) {
    const plan = await provA.chatJSON<PlanDraft>({
      system: sys,
      messages: [{ role: "user", content: userPrompt }],
      maxTokens: 8000,
    });
    return persistPlan(
      userId,
      plan,
      [{ role: "PROPOSER_A", provider: roles.proposerA, model: provA.model, content: plan }],
      "multi-llm",
    );
  }

  // --- 2 LLM: uno propone, l'altro revisiona/migliora ---
  if (count === 2) {
    const supName = roles.proposerB !== roles.proposerA ? roles.proposerB : roles.supervisor;
    const provSup = getProvider(supName);
    const propA = await provA.chatJSON<PlanDraft>({
      system: sys,
      messages: [{ role: "user", content: userPrompt }],
      maxTokens: 8000,
    });
    const finalPlan = await provSup.chatJSON<PlanDraft>({
      system: supervisorSystem(),
      messages: [{ role: "user", content: supervisorUserPrompt(brief, knowledge, today, propA, null) }],
      maxTokens: 8000,
    });
    return persistPlan(
      userId,
      finalPlan,
      [
        { role: "PROPOSER_A", provider: roles.proposerA, model: provA.model, content: propA },
        { role: "SUPERVISOR", provider: supName, model: provSup.model, content: finalPlan },
      ],
      "multi-llm",
    );
  }

  // --- 3 LLM: 2 propongono + 1 supervisiona ---
  const provB = getProvider(roles.proposerB);
  const provSup = getProvider(roles.supervisor);
  const [propA, propB] = await Promise.all([
    provA.chatJSON<PlanDraft>({ system: sys, messages: [{ role: "user", content: userPrompt }], maxTokens: 8000 }),
    provB.chatJSON<PlanDraft>({ system: sys, messages: [{ role: "user", content: userPrompt }], maxTokens: 8000 }),
  ]);
  const finalPlan = await provSup.chatJSON<PlanDraft>({
    system: supervisorSystem(),
    messages: [{ role: "user", content: supervisorUserPrompt(brief, knowledge, today, propA, propB) }],
    maxTokens: 8000,
  });
  const proposals = [
    { role: "PROPOSER_A", provider: roles.proposerA, model: provA.model, content: propA },
    { role: "PROPOSER_B", provider: roles.proposerB, model: provB.model, content: propB },
    { role: "SUPERVISOR", provider: roles.supervisor, model: provSup.model, content: finalPlan },
  ];
  return persistPlan(userId, finalPlan, proposals, "multi-llm");
}

// ---------------------------------------------------------------------------
// Persistenza
// ---------------------------------------------------------------------------

/**
 * Se una seduta cross-training/forza ha gli esercizi solo nella descrizione
 * (e non nel campo strutturato), li estrae così da poter mostrare le immagini.
 */
async function enrichExercises(plan: PlanDraft): Promise<void> {
  const configured = configuredProviders();
  if (configured.length === 0) return;
  const order: ProviderName[] = ["deepseek", "openai", "claude"];
  const pName = order.find((p) => configured.includes(p)) ?? configured[0];
  const provider = getProvider(pName);

  const targets = (plan.workouts ?? []).filter(
    (w) =>
      w &&
      w.type === "cross" &&
      w.description &&
      (!Array.isArray(w.exercises) || w.exercises.length === 0),
  );

  for (const w of targets) {
    try {
      const out = await provider.chatJSON<{
        exercises: { name: string; detail?: string; reps?: string }[];
      }>({
        system:
          'Estrai i singoli esercizi di forza/ginnastica/pliometria dalla descrizione (NON gli esercizi di corsa). Nomi brevi e chiari. Rispondi SOLO con JSON: {"exercises":[{"name":"...","detail":"...","reps":"..."}]}',
        messages: [{ role: "user", content: w.description! }],
        temperature: 0.2,
        maxTokens: 800,
      });
      if (Array.isArray(out.exercises) && out.exercises.length) {
        w.exercises = out.exercises;
      }
    } catch {
      /* best-effort */
    }
  }
}

async function persistPlan(
  userId: string,
  plan: PlanDraft,
  proposals: {
    role: string;
    provider: string;
    model: string;
    content: unknown;
  }[],
  engine: "multi-llm" | "mock",
): Promise<GenerateResult> {
  // estrai esercizi dalle descrizioni delle sedute cross se mancano nel campo strutturato
  if (engine === "multi-llm") {
    await enrichExercises(plan);
  }

  const workouts = (plan.workouts ?? []).filter((w) => w && w.type);
  const dates = workouts
    .map((w) => (w.date ? new Date(w.date) : null))
    .filter((d): d is Date => !!d && !isNaN(d.getTime()));
  const startDate = dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : new Date();
  const endDate = dates.length
    ? new Date(Math.max(...dates.map((d) => d.getTime())))
    : new Date(Date.now() + PLAN_HORIZON_DAYS * 86400000);

  // archivia i piani attivi precedenti
  await db.trainingPlan.updateMany({
    where: { userId, status: "active" },
    data: { status: "archived" },
  });

  const created = await db.trainingPlan.create({
    data: {
      userId,
      title: plan.title ?? "Piano di allenamento",
      startDate,
      endDate,
      status: "active",
      rationale: plan.rationale ?? null,
      workouts: {
        create: workouts.map((w, i) => ({
          date: w.date && !isNaN(new Date(w.date).getTime())
            ? new Date(w.date)
            : new Date(Date.now() + i * 86400000),
          type: w.type,
          title: w.title ?? null,
          description: w.description ?? null,
          targetDistanceKm: w.targetDistanceKm ?? null,
          targetPaceMinSec: w.targetPaceMinSec ?? null,
          targetPaceMaxSec: w.targetPaceMaxSec ?? null,
          targetHrZone: w.targetHrZone ?? null,
          structure: (w.structure as object) ?? undefined,
          exercises: (w.exercises as object) ?? undefined,
          order: i,
        })),
      },
      proposals: {
        create: proposals.map((p) => ({
          role: p.role,
          provider: p.provider,
          model: p.model,
          content: p.content as object,
        })),
      },
    },
  });

  // pre-genera in background le immagini degli esercizi (esclusa la corsa)
  const exerciseNames = workouts.flatMap((w) =>
    Array.isArray(w.exercises)
      ? w.exercises.map((e) => e?.name).filter((n): n is string => !!n)
      : [],
  );
  if (exerciseNames.length) {
    void pregenerateExerciseImages(exerciseNames);
  }

  return { planId: created.id, engine };
}

// ---------------------------------------------------------------------------
// Piano mock (nessuna API key) - rule based semplice
// ---------------------------------------------------------------------------

function mockPlan(today: string): PlanDraft {
  const base = new Date(today);
  const week = [
    { type: "easy", title: "Corsa lenta", km: 6 },
    { type: "interval", title: "Ripetute 5x800m", km: 8 },
    { type: "rest", title: "Riposo", km: 0 },
    { type: "tempo", title: "Medio progressivo", km: 8 },
    { type: "easy", title: "Corsa lenta", km: 6 },
    { type: "long", title: "Lungo lento", km: 14 },
    { type: "rest", title: "Riposo", km: 0 },
  ];
  const workouts: WorkoutDraft[] = [];
  for (let i = 0; i < PLAN_HORIZON_DAYS; i++) {
    const d = new Date(base.getTime() + i * 86400000);
    const w = week[i % 7];
    workouts.push({
      date: d.toISOString().slice(0, 10),
      type: w.type,
      title: w.title,
      description:
        w.type === "rest"
          ? "Giorno di riposo o attività leggera."
          : `${w.title} — circa ${w.km} km. (Piano generato in modalità demo: configura le API key LLM per piani personalizzati.)`,
      targetDistanceKm: w.km || undefined,
      targetHrZone: w.type === "easy" || w.type === "long" ? "Z2" : "Z4",
    });
  }
  return {
    title: "Piano demo (2 settimane)",
    rationale:
      "Piano di esempio rule-based. Configura ANTHROPIC_API_KEY / OPENAI_API_KEY / DEEPSEEK_API_KEY per attivare il motore a 3 LLM personalizzato.",
    workouts,
  };
}
