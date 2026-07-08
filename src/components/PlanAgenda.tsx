"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/LangProvider";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";

export interface Exercise {
  name: string;
  detail?: string;
  reps?: string;
}
export interface WorkoutDTO {
  id: string;
  dateISO: string;
  type: string;
  title: string | null;
  description: string | null;
  targetDistanceKm: number | null;
  targetPaceMinSec: number | null;
  targetPaceMaxSec: number | null;
  targetHrZone: string | null;
  structure: unknown;
  exercises: Exercise[] | null;
  completed: boolean;
}
export interface ActDTO {
  type: string | null;
  distanceKm: number | null;
}
export interface DayDTO {
  dateISO: string;
  dayNum: number;
  workouts: WorkoutDTO[];
  activities: ActDTO[];
}
export interface WeekDTO {
  index: number;
  startLabel: string;
  endLabel: string;
  days: DayDTO[];
}

const WEEKDAY_KEYS = ["pa.wd0", "pa.wd1", "pa.wd2", "pa.wd3", "pa.wd4", "pa.wd5", "pa.wd6"];

const typeColors: Record<string, string> = {
  easy: "bg-green-500/15 text-green-600 border-green-500/30",
  long: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  tempo: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  interval: "bg-red-500/15 text-red-600 border-red-500/30",
  recovery: "bg-teal-500/15 text-teal-600 border-teal-500/30",
  race: "bg-purple-500/15 text-purple-600 border-purple-500/30",
  cross: "bg-indigo-500/15 text-indigo-600 border-indigo-500/30",
  rest: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
};

const TYPE_KEYS = ["easy", "long", "tempo", "interval", "recovery", "race", "cross", "rest"];

function pace(sec: number | null) {
  if (!sec) return null;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}/km`;
}

export default function PlanAgenda({
  weeks,
  offDays,
  todayISO,
  initialWeek = 0,
  isAdmin = false,
}: {
  weeks: WeekDTO[];
  offDays: string[];
  todayISO: string;
  initialWeek?: number;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const tr = useT();
  const tl = (t: string) => (TYPE_KEYS.includes(t) ? tr(`type.${t}`) : tr("type.default"));
  const [wi, setWi] = useState(Math.min(initialWeek, Math.max(0, weeks.length - 1)));
  const [off, setOff] = useState<Set<string>>(new Set(offDays));
  const [selected, setSelected] = useState<WorkoutDTO | null>(null);
  const [seqEx, setSeqEx] = useState<Exercise | null>(null);
  const [dirty, setDirty] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmDelId, setConfirmDelId] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(
    () =>
      new Set(
        weeks.flatMap((w) => w.days).flatMap((d) => d.workouts).filter((x) => x.completed).map((x) => x.id),
      ),
  );

  async function moveWorkout(id: string, date: string) {
    if (!date) return;
    setActionError(null);
    try {
      const res = await fetch(`/api/workouts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      if (!res.ok) throw new Error();
      setSelected(null);
      router.refresh();
    } catch {
      setActionError(tr("c.actionErr"));
    }
  }

  async function delWorkout(id: string) {
    setActionError(null);
    try {
      const res = await fetch(`/api/workouts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setConfirmDelId(null);
      setSelected(null);
      router.refresh();
    } catch {
      setActionError(tr("c.actionErr"));
    }
  }

  async function toggleComplete(id: string) {
    const willDone = !done.has(id);
    setActionError(null);
    setDone((prev) => {
      const n = new Set(prev);
      if (willDone) n.add(id);
      else n.delete(id);
      return n;
    });
    try {
      const res = await fetch(`/api/workouts/${id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: willDone }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      // rollback dello stato ottimistico + notifica
      setDone((prev) => {
        const n = new Set(prev);
        if (willDone) n.delete(id);
        else n.add(id);
        return n;
      });
      setActionError(tr("c.actionErr"));
    }
  }

  async function toggleOff(dateISO: string, e: React.MouseEvent) {
    e.stopPropagation();
    const willOff = !off.has(dateISO);
    setActionError(null);
    setOff((prev) => {
      const n = new Set(prev);
      if (willOff) n.add(dateISO);
      else n.delete(dateISO);
      return n;
    });
    setDirty(true);
    try {
      const res = await fetch("/api/off-days", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateISO, off: willOff }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      // rollback dello stato ottimistico + notifica
      setOff((prev) => {
        const n = new Set(prev);
        if (willOff) n.delete(dateISO);
        else n.add(dateISO);
        return n;
      });
      setActionError(tr("c.actionErr"));
    }
  }

  return (
    <>
      {dirty && (
        <div className="mb-4 rounded-lg bg-brand/10 px-4 py-2 text-sm text-brand">
          {tr("pa.dirtyPre")} <b>{tr("pa.dirtyBold")}</b> {tr("pa.dirtyPost")}
        </div>
      )}

      {weeks.length > 0 && (
        <div>
          {/* navigatore settimane */}
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              onClick={() => setWi((i) => Math.max(0, i - 1))}
              disabled={wi === 0}
              className="btn-ghost px-3 py-1.5 text-sm disabled:opacity-40"
            >
              {tr("pa.prev")}
            </button>
            <div className="text-center">
              <div className="font-semibold">
                {weeks[wi].startLabel} – {weeks[wi].endLabel}
              </div>
              {weeks[wi].days.some((d) => d.dateISO === todayISO) && (
                <div className="text-xs text-brand">{tr("pa.currentWeek")}</div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setWi(Math.min(initialWeek, weeks.length - 1))}
                className="btn-ghost px-3 py-1.5 text-sm"
              >
                {tr("pa.today")}
              </button>
              <button
                onClick={() => setWi((i) => Math.min(weeks.length - 1, i + 1))}
                disabled={wi >= weeks.length - 1}
                className="btn-ghost px-3 py-1.5 text-sm disabled:opacity-40"
              >
                {tr("pa.next")}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="grid min-w-[760px] grid-cols-7 gap-2">
              {weeks[wi].days.map((day, di) => {
                const isToday = day.dateISO === todayISO;
                const isPast = day.dateISO < todayISO;
                const isOff = off.has(day.dateISO);
                return (
                  <div
                    key={day.dateISO}
                    className={`flex min-h-32 flex-col rounded-xl border p-2 transition ${
                      isOff
                        ? "border-dashed border-zinc-400/40 bg-zinc-500/5"
                        : isToday
                          ? "border-brand bg-card ring-2 ring-brand/30"
                          : isPast
                            ? "border-border bg-surface/50"
                            : "border-border bg-card"
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-medium text-muted">{tr(WEEKDAY_KEYS[di])}</span>
                      <span className={`text-xs ${isToday ? "font-bold text-brand" : "text-muted"}`}>
                        {day.dayNum}
                      </span>
                    </div>

                    <div className="flex-1 space-y-1.5">
                      {isOff ? (
                        <div className="pt-1 text-center text-xs font-medium text-zinc-500">
                          {tr("pa.dayOff")}
                        </div>
                      ) : (
                        day.workouts.map((w) => (
                          <button
                            key={w.id}
                            onClick={() => setSelected(w)}
                            className={`w-full rounded-lg border p-2 text-left text-xs transition hover:brightness-95 ${
                              typeColors[w.type] ?? "border-border bg-surface"
                            }`}
                          >
                            <div className="flex items-center gap-1 font-semibold">
                              {done.has(w.id) && <span className="text-green-600">✓</span>}
                              <span className={done.has(w.id) ? "line-through opacity-70" : ""}>
                                {tl(w.type)}
                              </span>
                            </div>
                            {w.title && <div className="mt-0.5 line-clamp-2 opacity-90">{w.title}</div>}
                            <div className="mt-1 flex flex-wrap gap-x-2 opacity-80">
                              {w.targetDistanceKm != null && <span>{w.targetDistanceKm} km</span>}
                              {w.targetHrZone && <span>{w.targetHrZone}</span>}
                            </div>
                          </button>
                        ))
                      )}

                      {/* allenamenti svolti (storico) */}
                      {day.activities.map((a, ai) => (
                        <div
                          key={`a${ai}`}
                          className="rounded-md bg-green-500/10 px-1.5 py-1 text-xs font-medium text-green-700"
                        >
                          {tr("pa.done")}{" "}
                          {a.distanceKm != null
                            ? `${a.distanceKm.toFixed(1)} km`
                            : a.type
                              ? tl(a.type)
                              : ""}
                        </div>
                      ))}

                      {!isOff && day.workouts.length === 0 && day.activities.length === 0 && (
                        <div aria-hidden="true" className="pt-2 text-center text-xs text-muted">
                          —
                        </div>
                      )}
                    </div>

                    <button
                      onClick={(e) => toggleOff(day.dateISO, e)}
                      className={`focus-ring mt-1.5 rounded-md py-1 text-xs transition ${
                        isOff
                          ? "text-brand hover:underline"
                          : "text-muted hover:bg-black/5 hover:text-foreground"
                      }`}
                    >
                      {isOff ? tr("pa.cancelOff") : tr("pa.markOff")}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Legenda */}
      <div className="mt-6 flex flex-wrap gap-3 text-xs text-muted">
        {TYPE_KEYS.map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={`inline-block h-3 w-3 rounded-full border ${typeColors[k]}`} />
            {tr(`type.${k}`)}
          </span>
        ))}
      </div>

      {/* Overlay dettaglio allenamento */}
      {selected && (
        <Modal onClose={() => setSelected(null)} size="lg" labelledById="pa-workout-title">
            <span
              className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${
                typeColors[selected.type] ?? "border-border"
              }`}
            >
              {tl(selected.type)}
            </span>
            <h2 id="pa-workout-title" className="mt-2 pr-9 text-xl font-bold">
              {selected.title ?? tl(selected.type)}
            </h2>

            {(selected.targetDistanceKm != null ||
              selected.targetPaceMinSec != null ||
              selected.targetHrZone) && (
              <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted">
                {selected.targetDistanceKm != null && <span>🎯 {selected.targetDistanceKm} km</span>}
                {selected.targetPaceMinSec != null && (
                  <span>
                    ⏱️ {pace(selected.targetPaceMinSec)}
                    {selected.targetPaceMaxSec ? `–${pace(selected.targetPaceMaxSec)}` : ""}
                  </span>
                )}
                {selected.targetHrZone && <span>❤️ {selected.targetHrZone}</span>}
              </div>
            )}

            {selected.description && (
              <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed">
                {selected.description}
              </p>
            )}

            <StructureBlock structure={selected.structure} />

            {selected.exercises && selected.exercises.length > 0 && (
              <div className="mt-5">
                <h3 className="mb-2 font-semibold">{tr("pa.exercises")}</h3>
                <div className="space-y-4">
                  {selected.exercises.map((ex, i) => (
                    <ExerciseItem key={i} ex={ex} onOpen={setSeqEx} />
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 space-y-3 border-t border-border pt-4">
              {selected.type !== "rest" && (
                <button
                  onClick={() => toggleComplete(selected.id)}
                  className={done.has(selected.id) ? "btn-ghost" : "btn-brand"}
                >
                  {done.has(selected.id)
                    ? tr("pa.completedToggle")
                    : tr("pa.markComplete")}
                </button>
              )}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <label htmlFor="pa-move-date" className="text-muted">
                  {tr("pa.moveTo")}
                </label>
                <input
                  id="pa-move-date"
                  type="date"
                  defaultValue={selected.dateISO}
                  onChange={(e) => moveWorkout(selected.id, e.target.value)}
                  className="input w-auto py-1.5"
                />
                <button
                  onClick={() => {
                    setConfirmDelId(selected.id);
                    setSelected(null);
                  }}
                  className="focus-ring ml-auto rounded font-medium text-red-500 hover:underline"
                >
                  {tr("pa.deleteWorkout")}
                </button>
              </div>
              {actionError && (
                <p role="alert" className="text-sm text-red-500">
                  {actionError}
                </p>
              )}
            </div>
        </Modal>
      )}

      {seqEx && <SequenceModal ex={seqEx} isAdmin={isAdmin} onClose={() => setSeqEx(null)} />}

      {confirmDelId && (
        <ConfirmDialog
          title={tr("pa.deleteTitle")}
          body={tr("pa.deleteBody")}
          confirmLabel={tr("pa.deleteConfirm")}
          danger
          onConfirm={() => delWorkout(confirmDelId)}
          onClose={() => setConfirmDelId(null)}
        />
      )}
    </>
  );
}

function StructureBlock({ structure }: { structure: unknown }) {
  const tr = useT();
  if (!structure || typeof structure !== "object") return null;
  const s = structure as Record<string, unknown>;
  const rows: [string, string][] = [];
  if (s.warmupKm) rows.push([tr("pa.warmup"), `${s.warmupKm} km`]);
  if (s.main) rows.push([tr("pa.mainPart"), String(s.main)]);
  if (s.cooldownKm) rows.push([tr("pa.cooldown"), `${s.cooldownKm} km`]);
  if (rows.length === 0) return null;
  return (
    <div className="mt-4 space-y-1 rounded-lg bg-surface p-3 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="flex gap-2">
          <span className="w-32 shrink-0 font-medium text-muted">{k}</span>
          <span>{v}</span>
        </div>
      ))}
    </div>
  );
}

function ExerciseItem({
  ex,
  onOpen,
}: {
  ex: Exercise;
  onOpen: (ex: Exercise) => void;
}) {
  const tr = useT();
  const [loading, setLoading] = useState(true);
  const [imgPath, setImgPath] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    // reset dello stato di caricamento al cambio di esercizio (ex.name):
    // setState sincrono voluto per il re-fetch dell'immagine.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/exercise-image?name=${encodeURIComponent(ex.name)}`)
      .then((r) => r.json())
      .then((d) => {
        if (active) {
          setImgPath(d.path ?? null);
          setLoading(false);
        }
      })
      .catch(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [ex.name]);

  return (
    <div className="flex gap-3 rounded-lg border border-border p-3">
      <button
        onClick={() => imgPath && onOpen(ex)}
        disabled={!imgPath}
        title={imgPath ? tr("pa.seeExecution") : undefined}
        className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-border"
      >
        {loading ? (
          <div className="flex h-full w-full animate-pulse items-center justify-center bg-gradient-to-br from-surface to-brand/5">
            <span className="text-lg opacity-30">🏋️</span>
          </div>
        ) : imgPath ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imgPath} alt={ex.name} loading="lazy" className="h-full w-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center text-lg text-white opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
              ▶
            </span>
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface text-lg opacity-20">
            🏋️
          </div>
        )}
      </button>
      <div className="min-w-0">
        <div className="font-medium">{ex.name}</div>
        {(ex.reps || ex.detail) && (
          <div className="text-sm text-muted">
            {ex.reps ? `${ex.reps} · ` : ""}
            {ex.detail}
          </div>
        )}
        {imgPath && (
          <button
            onClick={() => onOpen(ex)}
            className="mt-1 text-xs font-medium text-brand hover:underline"
          >
            {tr("pa.seeExecutionLink")}
          </button>
        )}
      </div>
    </div>
  );
}

function SequenceModal({
  ex,
  isAdmin,
  onClose,
}: {
  ex: Exercise;
  isAdmin: boolean;
  onClose: () => void;
}) {
  const tr = useT();
  const [loading, setLoading] = useState(true);
  const [steps, setSteps] = useState<{ path: string; caption: string }[]>([]);

  async function load(force = false) {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/exercise-sequence?name=${encodeURIComponent(ex.name)}${force ? "&force=1" : ""}`,
      );
      const d = await res.json();
      setSteps(d.steps ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // load() imposta loading=true in modo sincrono: caricamento iniziale della
    // sequenza al mount / cambio esercizio, voluto.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ex.name]);

  return (
    <Modal onClose={onClose} size="md" labelledById="pa-seq-title">
        <h3 id="pa-seq-title" className="pr-9 text-lg font-bold">
          {ex.name}
        </h3>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">{tr("pa.sequence")}</p>
          {isAdmin && !loading && (
            <button onClick={() => load(true)} className="text-xs text-brand hover:underline">
              {tr("pa.regenShort")}
            </button>
          )}
        </div>

        {loading ? (
          <div className="mt-4 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="aspect-square w-full animate-pulse rounded-lg bg-surface" />
            ))}
            <p className="text-center text-xs text-muted">{tr("pa.genSequence")}</p>
          </div>
        ) : steps.length ? (
          <div className="mt-4 space-y-4">
            {steps.map((s, i) => (
              <div key={i}>
                <div className="mb-1 text-sm font-medium">
                  {i + 1}. {s.caption}
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.path} alt={s.caption} className="w-full rounded-lg border border-border" />
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">{tr("pa.noSequence")}</p>
        )}
    </Modal>
  );
}
