import { auth } from "@/auth";
import { db } from "@/lib/db";
import { resolveUserTier } from "@/lib/plans";
import ProfileTabs from "@/components/ProfileTabs";
import LlmCountForm from "@/components/LlmCountForm";
import IntegrationsPanel from "@/components/IntegrationsPanel";
import ByokForm from "@/components/ByokForm";
import { t as i18nT } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n-server";

export default async function ProfileSettingsPage() {
  const session = await auth();
  const userId = session!.user.id;
  const lang = await getServerLang();
  const tr = (k: string) => i18nT(lang, k);
  const [profile, { def }, llmCfg] = await Promise.all([
    db.athleteProfile.findUnique({ where: { userId } }),
    resolveUserTier(userId),
    db.userLlmConfig.findUnique({ where: { userId } }),
  ]);
  const prefs = (profile?.preferences as Record<string, unknown> | null) ?? null;
  const llmInitial =
    typeof prefs?.llmCount === "number" ? (prefs.llmCount as number) : 3;
  const maxLlms = def?.maxLlms ?? 1;
  const byokAllowed = def?.id === "pro";

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-bold">{tr("an.profile")}</h1>
      <ProfileTabs />

      <div className="space-y-6">
        <LlmCountForm initial={llmInitial} maxLlms={maxLlms} />

        <ByokForm
          allowed={byokAllowed}
          initial={
            llmCfg
              ? {
                  provider: llmCfg.provider,
                  model: llmCfg.model,
                  enabled: llmCfg.enabled,
                  hasKey: !!llmCfg.apiKeyEnc,
                }
              : null
          }
        />

        <div>
          <h2 className="mb-1 text-lg font-bold">{tr("integ.title")}</h2>
          <p className="mb-4 text-sm text-muted">{tr("integ.settingsDesc")}</p>
          <IntegrationsPanel />
        </div>
      </div>
    </div>
  );
}
