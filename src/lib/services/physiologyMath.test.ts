import { describe, it, expect } from "vitest";
import {
  median,
  linRegSlope,
  decoupling,
  paceDegradation,
  zonesFromLthr,
  round1,
  type Split,
} from "./physiologyMath";

describe("median", () => {
  it("null su lista vuota", () => {
    expect(median([])).toBeNull();
  });
  it("dispari = elemento centrale", () => {
    expect(median([3, 1, 2])).toBe(2);
  });
  it("pari = media dei due centrali", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
  it("ignora i non-finiti", () => {
    expect(median([1, NaN, 3])).toBe(2);
  });
});

describe("linRegSlope", () => {
  it("null con meno di 4 punti", () => {
    expect(linRegSlope([{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }])).toBeNull();
  });
  it("null se x senza varianza", () => {
    const pts = [0, 1, 2, 3].map((i) => ({ x: 5, y: i }));
    expect(linRegSlope(pts)).toBeNull();
  });
  it("pendenza positiva su relazione lineare", () => {
    // y = 2x + 1
    const pts = [0, 1, 2, 3, 4].map((x) => ({ x, y: 2 * x + 1 }));
    expect(linRegSlope(pts)).toBeCloseTo(2, 6);
  });
});

describe("decoupling", () => {
  it("null con meno di 4 split usabili", () => {
    expect(decoupling([{ paceSecPerKm: 300, hr: 150 }])).toBeNull();
  });
  it("~0% se passo e FC costanti", () => {
    const splits: Split[] = Array.from({ length: 6 }, () => ({
      paceSecPerKm: 300,
      hr: 150,
    }));
    expect(decoupling(splits)!).toBeCloseTo(0, 6);
  });
  it("positivo se la FC sale a parità di passo (drift cardiaco)", () => {
    // prima metà FC 150, seconda metà FC 165, passo costante → EF cala → % > 0
    const splits: Split[] = [
      { paceSecPerKm: 300, hr: 150 },
      { paceSecPerKm: 300, hr: 150 },
      { paceSecPerKm: 300, hr: 165 },
      { paceSecPerKm: 300, hr: 165 },
    ];
    const d = decoupling(splits)!;
    expect(d).toBeGreaterThan(0);
    // EF drift = 1 - 150/165 ≈ 9.09%
    expect(d).toBeCloseTo((1 - 150 / 165) * 100, 4);
  });
  it("scarta gli split senza FC o passo", () => {
    const splits: Split[] = [
      { paceSecPerKm: 300, hr: null },
      { paceSecPerKm: null, hr: 150 },
      { paceSecPerKm: 300, hr: 150 },
    ];
    expect(decoupling(splits)).toBeNull(); // solo 1 usabile
  });
});

describe("paceDegradation", () => {
  it("0% se passo costante", () => {
    const splits: Split[] = Array.from({ length: 8 }, () => ({ paceSecPerKm: 300 }));
    expect(paceDegradation(splits)!).toBeCloseTo(0, 6);
  });
  it("positivo se il passo rallenta nel finale", () => {
    // primo quarto 300, ultimo quarto 330 → +10%
    const splits: Split[] = [300, 300, 310, 315, 320, 320, 330, 330].map((p) => ({
      paceSecPerKm: p,
    }));
    const deg = paceDegradation(splits)!;
    expect(deg).toBeCloseTo(10, 6); // (330-300)/300
  });
});

describe("zonesFromLthr", () => {
  it("zone monotone e coerenti con la LTHR", () => {
    const z = zonesFromLthr(170, 185);
    expect(z.z1.max).toBeLessThan(z.z2.min);
    expect(z.z2.max).toBeLessThan(z.z3.min);
    expect(z.z3.max).toBeLessThan(z.z4.min);
    expect(z.z4.max).toBeLessThan(z.z5.min);
    // Z4 finisce appena sotto la soglia, Z5 parte dalla soglia
    expect(z.z5.min).toBe(170);
    // il tetto di Z5 non è mai sotto la FC max
    expect(z.z5.max).toBeGreaterThanOrEqual(185);
  });
  it("il tetto di Z5 usa la stima 1.06·LTHR se supera la FC max", () => {
    const z = zonesFromLthr(170, 170);
    expect(z.z5.max).toBe(Math.round(170 * 1.06));
  });
});

describe("round1", () => {
  it("arrotonda a un decimale", () => {
    expect(round1(9.087)).toBe(9.1);
  });
  it("propaga null", () => {
    expect(round1(null)).toBeNull();
  });
});
