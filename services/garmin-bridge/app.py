"""
Garmin Bridge — wrapper HTTP sottile attorno al CLI `garmin-givemydata`.

Esegue il tool NON modificato (confine AGPL) con una data-dir per utente, poi
legge il SQLite `garmin.db` prodotto e restituisce righe PULITE e piatte
(le colonne normalizzate del tool + alcuni campi estratti dal raw_json via
json_extract: dew point, HRV notturna). La mappatura verso i modelli di
RunnerAI avviene lato app (TypeScript).

Credenziali via env GARMIN_EMAIL / GARMIN_PASSWORD → sync non interattivo.
"""
import os
import sqlite3
import subprocess
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

SERVICE_TOKEN = os.environ.get("SERVICE_TOKEN", "")
DATA_ROOT = Path(os.environ.get("GARMIN_DATA_ROOT", "/data"))
CLI = "garmin-givemydata"

app = FastAPI(title="RunnerAI Garmin Bridge", version="0.3.0")

# SELECT puliti per tabella (colonne piatte + estrazioni dal raw_json).
QUERIES = {
    "sleep": """SELECT calendar_date, sleep_time_seconds, deep_sleep_seconds, light_sleep_seconds,
        rem_sleep_seconds, awake_sleep_seconds, average_spo2, lowest_spo2, average_respiration,
        sleep_score_overall, resting_heart_rate,
        json_extract(raw_json,'$.avgOvernightHrv') AS avg_overnight_hrv FROM sleep""",
    "hrv": "SELECT calendar_date, weekly_avg, last_night_avg, status FROM hrv",
    "daily_summary": """SELECT calendar_date, resting_heart_rate, average_stress_level,
        body_battery_highest, body_battery_lowest, average_spo2, avg_waking_respiration FROM daily_summary""",
    "training_status": "SELECT calendar_date, status, acute_load, chronic_load FROM training_status",
    "training_readiness": "SELECT calendar_date, score, level, recovery_time FROM training_readiness",
    "vo2max": "SELECT calendar_date, sport, value FROM vo2max",
    "hydration": "SELECT calendar_date, intake_ml, sweat_loss_ml FROM hydration",
    "activity": """SELECT activity_id, activity_name, activity_type, start_time_gmt, duration_seconds,
        distance_meters, average_hr, max_hr, avg_cadence, avg_power, elevation_gain, vo2max_value,
        training_load, avg_grade_adjusted_speed, direct_workout_rpe, direct_workout_feel,
        min_temperature, max_temperature, start_latitude, start_longitude, location_name FROM activity""",
    "activity_splits": """SELECT activity_id, split_number, distance_meters, duration_seconds,
        average_speed, average_hr, max_hr, avg_cadence, elevation_gain, normalized_power FROM activity_splits
        ORDER BY activity_id, split_number""",
    "activity_weather": """SELECT activity_id, temperature, apparent_temperature, humidity, wind_speed,
        wind_direction, weather_type, json_extract(raw_json,'$.dewPoint') AS dew_point FROM activity_weather""",
    "running_dynamics": "SELECT activity_id, avg_gct, avg_vert_osc, avg_vert_ratio, avg_stride_len FROM running_dynamics",
    "activity_hr_zones": """SELECT activity_id, zone1_seconds, zone2_seconds, zone3_seconds,
        zone4_seconds, zone5_seconds FROM activity_hr_zones""",
}


class SyncRequest(BaseModel):
    user_id: str
    email: str
    password: str
    days: int = 90
    full: bool = False


def _check_auth(authorization: str | None) -> None:
    if not SERVICE_TOKEN or authorization != f"Bearer {SERVICE_TOKEN}":
        raise HTTPException(status_code=401, detail="Non autorizzato")


@app.get("/health")
def health() -> dict:
    return {"ok": True}


def _read_tables(db_path: Path) -> dict:
    con = sqlite3.connect(str(db_path))
    con.row_factory = sqlite3.Row
    try:
        out: dict = {}
        for name, sql in QUERIES.items():
            try:
                out[name] = [dict(r) for r in con.execute(sql)]
            except sqlite3.Error:
                out[name] = []
        return out
    finally:
        con.close()


def _looks_like_supervised(text: str) -> bool:
    t = (text or "").lower()
    return any(k in t for k in ("mfa", "2fa", "verification", "cloudflare", "challenge", "captcha", "credentials not found"))


@app.post("/sync")
def sync(req: SyncRequest, authorization: str | None = Header(default=None)) -> dict:
    _check_auth(authorization)
    data_dir = DATA_ROOT / req.user_id
    data_dir.mkdir(parents=True, exist_ok=True)
    env = dict(os.environ, GARMIN_DATA_DIR=str(data_dir),
               GARMIN_EMAIL=req.email, GARMIN_PASSWORD=req.password,
               PYTHONUTF8="1", PYTHONUNBUFFERED="1")

    sync_args = [CLI, "--full"] if req.full else [CLI, "--days", str(req.days)]
    try:
        r = subprocess.run(sync_args, env=env, capture_output=True, text=True, timeout=1800)
    except subprocess.TimeoutExpired:
        return {"ok": False, "user_id": req.user_id, "error": "Timeout durante il sync."}
    if r.returncode != 0:
        err = (r.stderr or r.stdout or "")[-800:]
        return {"ok": False, "user_id": req.user_id, "error": err or "Sync fallito.",
                "needs_supervised_login": _looks_like_supervised(err)}

    db_path = data_dir / "garmin.db"
    if not db_path.exists():
        return {"ok": False, "user_id": req.user_id, "error": "garmin.db non trovato dopo il sync."}

    tables = _read_tables(db_path)
    counts = {k: len(v) for k, v in tables.items()}
    return {"ok": True, "user_id": req.user_id, "counts": counts, "tables": tables}
