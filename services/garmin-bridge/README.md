# RunnerAI — Garmin Bridge (beta friends & family)

Server **isolato** che estrae i dati Garmin ricchi (sonno, HRV, RHR, body
battery, stress, VO₂max, stream ~1Hz, meteo per attività) eseguendo il tool
**`garmin-givemydata`** (Python, AGPL-3.0) come **CLI non modificato**, e ne
restituisce l'export JSON grezzo. La mappatura verso i modelli normalizzati di
RunnerAI (`SleepRecord`, `DailyMetric`, `ActivityStream`, `EnvironmentSnapshot`)
avviene **lato RunnerAI in TypeScript**, non qui.

> ⚠️ Soluzione **temporanea** per il beta con pochi utenti fidati. Non scala e
> non è pensata per la produzione mainstream → in seguito si passa a un
> aggregatore / alla Garmin Health API ufficiale.

## Perché isolato

- **Confine AGPL.** Il bridge invoca `garmin-givemydata` come processo separato
  (installato via pip, **non modificato**) e ne legge solo l'output. Il codice
  di RunnerAI non lo linka/importa → resta proprietario. Questo servizio-wrapper
  è minimale e può restare separato dall'app.
- **Chrome + always-on.** Il tool pilota Chrome "undetected" per bypassare il
  Cloudflare di Garmin: serve un ambiente con Chrome e un **IP di egress
  stabile** (i token Cloudflare sono legati all'IP). Impossibile su serverless.

## Architettura

```
RunnerAI (Vercel)  ──HTTPS + Bearer SERVICE_TOKEN──▶  Garmin-Bridge (Docker su VPS)
  credenziali utente (decifrate                         GARMIN_DATA_DIR=/data/<userId>
  al volo da IntegrationConnection)                     garmin-givemydata --days N
                                                        garmin-givemydata --export
  ◀──────────── export JSON grezzo ─────────────────────┘
  /api/service/garmin-import → mappa nei modelli normalizzati
```

## Deploy (Docker su VPS)

```bash
# sul VPS (IP stabile), nella cartella services/garmin-bridge
docker build -t runnerai-garmin-bridge .
docker run -d --name garmin-bridge \
  -p 8080:8080 \
  -e SERVICE_TOKEN="<lo stesso SERVICE_TOKEN di RunnerAI>" \
  -v /srv/garmin-data:/data \
  --restart unless-stopped \
  runnerai-garmin-bridge
```

Metti il container dietro un reverse proxy con TLS (Caddy/Traefik) e limita
l'accesso all'IP di RunnerAI. In RunnerAI imposta `GARMIN_BRIDGE_URL` all'URL
pubblico del bridge.

## API

`GET /health` → `{ "ok": true }`

`POST /sync` (header `Authorization: Bearer <SERVICE_TOKEN>`)
```json
{ "user_id": "clx...", "email": "utente@example.com", "password": "…", "days": 90, "full": false }
```
Risposta: `{ "ok": true, "user_id": "…", "export": { <file JSON del tool> } }`
(oppure `{ "ok": false, "error": "…", "needs_supervised_login": true }`).

## Credenziali (non interattivo)

Verificato nel sorgente del tool (`garmin_mcp/sync.py`): le credenziali si
passano via env **`GARMIN_EMAIL`** / **`GARMIN_PASSWORD`** (o un file `.env`
nella data-dir dell'utente). Il bridge le imposta al volo per il processo →
**nessun prompt interattivo**. Il "setup" interattivo del README upstream è solo
il loro `setup.sh`, non serve qui.

## Caveat noti (accettabili in beta)

- **MFA / Cloudflare.** Se l'account ha la verifica in due passaggi o Garmin
  presenta un challenge, il login headless può fallire: il bridge risponde
  `needs_supervised_login=true`. In tal caso serve **un run supervisionato una
  tantum** sul VPS (`docker exec -it garmin-bridge garmin-givemydata`) per
  stabilire la sessione; dopo, persiste in `/data/<userId>`.
- **MFA.** Se l'utente ha la verifica in due passaggi, il login headless può
  fallire: gestiscilo come stato `needs_supervised_login`.
- **Fragilità.** Garmin può cambiare le difese in qualsiasi momento: è il motivo
  per cui questa via è temporanea.
- **Sicurezza.** Il bridge riceve password Garmin in chiaro (dietro TLS): non
  loggarle mai, non persisterle oltre `GARMIN_DATA_DIR` (sessione), isola il VPS.
  Il consenso al trattamento di dati sulla salute è coperto dalla Privacy Policy.

## Contratto di ingestione (lato RunnerAI, TODO)

Da rifinire su un **export reale**: mappare i file JSON del tool alle tabelle
`SleepRecord` / `DailyMetric` / `ActivityStream` / `EnvironmentSnapshot` in
`/api/service/garmin-import`. I nomi esatti di tabelle/campi del tool vanno
confermati con `garmin-givemydata --status` e ispezionando `garmin.db`.
