import { describe, it, expect } from "vitest";
import { pearson } from "./stats";

describe("pearson", () => {
  it("ritorna null con meno di 3 punti", () => {
    expect(pearson([[1, 1], [2, 2]])).toBeNull();
  });

  it("correlazione positiva perfetta = 1", () => {
    const r = pearson([[1, 2], [2, 4], [3, 6], [4, 8]]);
    expect(r).not.toBeNull();
    expect(r!).toBeCloseTo(1, 5);
  });

  it("correlazione negativa perfetta = -1", () => {
    const r = pearson([[1, 8], [2, 6], [3, 4], [4, 2]]);
    expect(r!).toBeCloseTo(-1, 5);
  });

  it("varianza nulla -> null", () => {
    expect(pearson([[5, 1], [5, 2], [5, 3]])).toBeNull();
  });
});
