import { auth } from "@/auth";
import { db } from "@/lib/db";
import { retrieveRelevant } from "@/lib/services/knowledge";
import KnowledgeCard from "@/components/KnowledgeCard";
import { isAdminEmail } from "@/lib/admin";
import { t as i18nT } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n-server";
import { titleMeta } from "@/lib/pageMeta";

export const generateMetadata = () => titleMeta("an.knowledge");

async function buildUserQuery(userId: string): Promise<string> {
  const [profile, race] = await Promise.all([
    db.athleteProfile.findUnique({ where: { userId } }),
    db.raceGoal.findFirst({
      where: { userId, status: "planned" },
      orderBy: [{ priority: "asc" }, { raceDate: "asc" }],
    }),
  ]);
  const level = profile?.experience ?? "runner";
  const goals = (profile?.goals as Record<string, unknown> | null) ?? null;
  const dist = race?.distanceKm ?? goals?.raceDistanceKm ?? null;
  return dist
    ? `allenamento corsa ${dist}km metodo periodizzazione ${level}`
    : `allenamento corsa personalizzato ${level} metodi scientifici`;
}

export default async function KnowledgePage() {
  const session = await auth();
  const lang = await getServerLang();
  const tr = (k: string) => i18nT(lang, k);
  const query = await buildUserQuery(session!.user.id);
  const [sources, total] = await Promise.all([
    retrieveRelevant(query, 30),
    db.scientificSource.count(),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-1 text-2xl font-bold">📚 {tr("an.knowledge")}</h1>
      <p className="mb-6 text-muted">
        {tr("kn.descA")}
        {total}
        {tr("kn.descB")}
      </p>

      {sources.length === 0 ? (
        <div className="card text-muted">{tr("kn.empty")}</div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sources.map((s, i) => (
            <KnowledgeCard
              key={s.id}
              source={s}
              index={i}
              isAdmin={isAdminEmail(session!.user.email)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
