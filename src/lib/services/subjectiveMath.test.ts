import { describe, it, expect } from "vitest";
import { pearson, strength, round2, type Pair } from "./subjectiveMath";

describe("pearson", () => {
  it("null con meno di 5 coppie", () => {
    const p: Pair[] = [
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
      { x: 4, y: 4 },
    ];
    expect(pearson(p)).toBeNull();
  });
  it("+1 su relazione lineare crescente perfetta", () => {
    const p: Pair[] = [1, 2, 3, 4, 5].map((v) => ({ x: v, y: 2 * v + 1 }));
    expect(pearson(p)!).toBeCloseTo(1, 6);
  });
  it("-1 su relazione lineare decrescente perfetta", () => {
    const p: Pair[] = [1, 2, 3, 4, 5].map((v) => ({ x: v, y: -3 * v }));
    expect(pearson(p)!).toBeCloseTo(-1, 6);
  });
  it("null se una variabile è costante (nessuna varianza)", () => {
    const p: Pair[] = [1, 2, 3, 4, 5].map((v) => ({ x: v, y: 7 }));
    expect(pearson(p)).toBeNull();
  });
  it("ignora le coppie non finite", () => {
    const p: Pair[] = [
      { x: 1, y: 2 },
      { x: 2, y: 4 },
      { x: NaN, y: 5 },
      { x: 3, y: 6 },
      { x: 4, y: 8 },
      { x: 5, y: 10 },
    ];
    expect(pearson(p)!).toBeCloseTo(1, 6);
  });
});

describe("strength", () => {
  it("classifica per soglie di |r|", () => {
    expect(strength(0.6)).toBe("strong");
    expect(strength(-0.55)).toBe("strong");
    expect(strength(0.35)).toBe("moderate");
    expect(strength(0.2)).toBe("weak");
    expect(strength(0.1)).toBeNull();
    expect(strength(null)).toBeNull();
  });
});

describe("round2", () => {
  it("arrotonda a due decimali", () => {
    expect(round2(0.12345)).toBe(0.12);
  });
  it("propaga null", () => {
    expect(round2(null)).toBeNull();
  });
});
