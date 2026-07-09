import { auth } from "@/auth";
import { db } from "@/lib/db";
import { encryptionConfigured } from "@/lib/crypto";
import { stravaConfigured } from "@/lib/integrations/strava";
import { garminReady } from "@/lib/integrations/garmin";
import { garminBridgeConfigured } from "@/lib/integrations/garminBridge";
import IntegrationActions from "@/components/IntegrationActions";
import GarminConnectForm from "@/components/GarminConnectForm";
import { fmtDate } from "@/lib/format";
import { t } from "@/lib/i18n";
import { getServerLang } from "@/lib/i18n-server";

function StatusBadge({
  connected,
  tr,
}: {
  connected: boolean;
  tr: (k: string) => string;
}) {
  return connected ? (
    <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-semibold text-green-600">
      {tr("integ.connected")}
    </span>
  ) : (
    <span className="rounded-full bg-zinc-500/15 px-2 py-0.5 text-xs font-semibold text-muted">
      {tr("integ.notConnected")}
    </span>
  );
}

/** Pannello integrazioni (Strava OAuth + Garmin credenziali cifrate). */
export default async function IntegrationsPanel() {
  const session = await auth();
  const lang = await getServerLang();
  const tr = (k: string) => t(lang, k);
  const connections = await db.integrationConnection.findMany({
    where: { userId: session!.user.id },
  });
  const byProvider = Object.fromEntries(connections.map((c) => [c.provider, c]));
  const encOk = encryptionConfigured();

  return (
    <div>
      <div className="mb-4 flex items-start gap-3 rounded-xl border border-border bg-surface p-4 text-sm">
        <span className="text-lg">🔒</span>
        <p className="text-muted">
          {tr("integ.encPre")} <b>{tr("integ.encBold")}</b>
          {tr("integ.encPost")}
          {!encOk && (
            <span className="mt-1 block font-medium text-red-500">
              {tr("integ.encKeyWarn")}
            </span>
          )}
        </p>
      </div>

      <div className="space-y-4">
        {/* STRAVA */}
        <div className="card">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-2xl">🟠</span>
            <h3 className="text-lg font-bold">Strava</h3>
            <StatusBadge connected={!!byProvider.strava} tr={tr} />
          </div>
          <p className="mb-4 text-sm text-muted">
            {tr("integ.stravaDesc")}
          </p>
          {byProvider.strava?.lastSyncAt && (
            <p className="mb-3 text-xs text-muted">
              {tr("integ.lastSync")} {fmtDate(byProvider.strava.lastSyncAt)}
            </p>
          )}
          {!encOk ? (
            <span className="text-sm text-muted">{tr("integ.configEncKey")}</span>
          ) : !stravaConfigured() ? (
            <span className="text-sm text-muted">
              {tr("integ.stravaNotConfigured")}
            </span>
          ) : (
            <IntegrationActions provider="strava" connected={!!byProvider.strava} canSync />
          )}
        </div>

        {/* GARMIN */}
        <div className="card">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-2xl">⌚</span>
            <h3 className="text-lg font-bold">Garmin Connect</h3>
            <StatusBadge connected={!!byProvider.garmin} tr={tr} />
          </div>
          <p className="mb-4 text-sm text-muted">
            {tr("integ.garminDesc")}
          </p>
          {byProvider.garmin?.lastSyncAt && (
            <p className="mb-3 text-xs text-muted">
              {tr("integ.lastSync")} {fmtDate(byProvider.garmin.lastSyncAt)}
              {byProvider.garmin.status === "error" && (
                <span className="ml-2 text-red-500">{tr("integ.lastAttemptFailed")}</span>
              )}
            </p>
          )}
          {!garminReady() ? (
            <span className="text-sm text-muted">{tr("integ.configEncKey")}</span>
          ) : byProvider.garmin ? (
            <IntegrationActions
              provider="garmin"
              connected
              canSync
              canDeepSync={garminBridgeConfigured()}
            />
          ) : (
            <GarminConnectForm />
          )}
        </div>
      </div>
    </div>
  );
}
