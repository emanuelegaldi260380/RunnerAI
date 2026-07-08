import Link from "next/link";
import IntegrationsPanel from "@/components/IntegrationsPanel";
import ApiTokensCard from "@/components/ApiTokensCard";
import { t as i18nT } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n-server";
import { titleMeta } from "@/lib/pageMeta";

export const generateMetadata = () => titleMeta("an.integrations");

export default async function IntegrationsPage() {
  const lang = await getServerLang();
  const tr = (k: string) => i18nT(lang, k);
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-bold">{tr("integ.title")}</h1>
      <p className="mb-6 text-muted">
        {tr("integ.descPre")}{" "}
        <Link href="/profile/settings" className="text-brand hover:underline">
          {tr("integ.linkProfileSettings")}
        </Link>
        .
      </p>
      <IntegrationsPanel />

      {/* Token API personali per il server MCP (Modulo 5) */}
      <div className="mt-6">
        <ApiTokensCard />
      </div>
    </div>
  );
}
