export function fmtPace(secPerKm: number | null | undefined): string {
  if (!secPerKm) return "—";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")}/km`;
}

export function fmtDuration(sec: number | null | undefined): string {
  if (!sec) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function fmtDistance(km: number | null | undefined): string {
  if (km == null) return "—";
  return `${km.toFixed(2)} km`;
}

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const typeLabels: Record<string, string> = {
  easy: "Lento",
  long: "Lungo",
  tempo: "Medio/Soglia",
  interval: "Ripetute",
  race: "Gara",
  recovery: "Recupero",
  rest: "Riposo",
  cross: "Cross-training",
  other: "Altro",
};

export function typeLabel(t: string | null | undefined): string {
  if (!t) return "Corsa";
  return typeLabels[t] ?? t;
}
