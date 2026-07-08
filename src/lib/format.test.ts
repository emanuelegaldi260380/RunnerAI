import { describe, it, expect } from "vitest";
import { fmtPace, fmtDuration, fmtDistance, typeLabel } from "./format";

describe("format", () => {
  it("fmtPace formatta sec/km", () => {
    expect(fmtPace(330)).toBe("5:30/km");
    expect(fmtPace(0)).toBe("—");
    expect(fmtPace(null)).toBe("—");
  });

  it("fmtDuration gestisce ore e minuti", () => {
    expect(fmtDuration(90)).toBe("1:30");
    expect(fmtDuration(3661)).toBe("1h 01m");
    expect(fmtDuration(null)).toBe("—");
  });

  it("fmtDistance con due decimali", () => {
    expect(fmtDistance(10)).toBe("10.00 km");
    expect(fmtDistance(null)).toBe("—");
  });

  it("typeLabel mappa i tipi noti", () => {
    expect(typeLabel("interval")).toBe("Ripetute");
    expect(typeLabel("cross")).toBe("Cross-training");
    expect(typeLabel(null)).toBe("Corsa");
  });
});
