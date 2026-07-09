import { describe, it, expect } from "vitest";
import {
  positiveSplitPct,
  paceCvPct,
  autopsyMetrics,
  executionScoreFromMetrics,
} from "./autopsyMath";
import type { Split } from "./physiologyMath";

describe("positiveSplitPct", () => {
  it("null con meno di 4 split", () => {
    expect(positiveSplitPct([{ paceSecPerKm: 300 }])).toBeNull();
  });
  it("0% se il passo è costante", () => {
    const s: Split[] = Array.from({ length: 6 }, () => ({ paceSecPerKm: 300 }));
    expect(positiveSplitPct(s)!).toBeCloseTo(0, 6);
  });
  it("positivo se la seconda metà è più lenta (positive split)", () => {
    // 1ª metà 300, 2ª metà 330 → +10%
    const s: Split[] = [300, 300, 330, 330].map((p) => ({ paceSecPerKm: p }));
    expect(positiveSplitPct(s)!).toBeCloseTo(10, 6);
  });
  it("negativo se la seconda metà è più veloce (negative split)", () => {
    const s: Split[] = [330, 330, 300, 300].map((p) => ({ paceSecPerKm: p }));
    expect(positiveSplitPct(s)!).toBeLessThan(0);
  });
});

describe("paceCvPct", () => {
  it("0% con passo costante", () => {
    const s: Split[] = Array.from({ length: 5 }, () => ({ paceSecPerKm: 300 }));
    expect(paceCvPct(s)!).toBeCloseTo(0, 6);
  });
  it("cresce con l'irregolarità del passo", () => {
    const regolare: Split[] = [300, 302, 298, 301].map((p) => ({ paceSecPerKm: p }));
    const irregolare: Split[] = [300, 360, 270, 330].map((p) => ({ paceSecPerKm: p }));
    expect(paceCvPct(irregolare)!).toBeGreaterThan(paceCvPct(regolare)!);
  });
});

describe("autopsyMetrics", () => {
  it("conta gli split usabili e arrotonda a 1 decimale", () => {
    const s: Split[] = [300, 300, 315, 330].map((p) => ({ paceSecPerKm: p }));
    const m = autopsyMetrics(s);
    expect(m.usableSplits).toBe(4);
    expect(m.positiveSplitPct).not.toBeNull();
  });
});

describe("executionScoreFromMetrics", () => {
  it("null se troppi pochi split", () => {
    expect(
      executionScoreFromMetrics(autopsyMetrics([{ paceSecPerKm: 300 }])),
    ).toBeNull();
  });
  it("prova regolare e ben distribuita → punteggio alto", () => {
    const s: Split[] = Array.from({ length: 8 }, () => ({ paceSecPerKm: 300, hr: 150 }));
    const score = executionScoreFromMetrics(autopsyMetrics(s));
    expect(score!).toBeGreaterThanOrEqual(90);
  });
  it("forte positive split + cedimento → punteggio più basso", () => {
    const good: Split[] = Array.from({ length: 8 }, () => ({ paceSecPerKm: 300, hr: 150 }));
    const bad: Split[] = [280, 285, 290, 300, 320, 340, 360, 380].map((p, i) => ({
      paceSecPerKm: p,
      hr: 150 + i * 3,
    }));
    const sGood = executionScoreFromMetrics(autopsyMetrics(good))!;
    const sBad = executionScoreFromMetrics(autopsyMetrics(bad))!;
    expect(sBad).toBeLessThan(sGood);
  });
});
