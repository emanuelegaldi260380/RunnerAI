import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema, raceSchema, hrZonesSchema } from "./validation";

describe("registerSchema", () => {
  const valid = {
    name: "Mario",
    email: "m@x.it",
    password: "password1",
    acceptTerms: true,
    acceptVexatious: true,
  };
  it("accetta dati validi", () => {
    const r = registerSchema.safeParse(valid);
    expect(r.success).toBe(true);
  });
  it("rifiuta email non valida", () => {
    const r = registerSchema.safeParse({ ...valid, email: "no" });
    expect(r.success).toBe(false);
  });
  it("rifiuta password corta", () => {
    const r = registerSchema.safeParse({ ...valid, password: "corta" });
    expect(r.success).toBe(false);
  });
  it("rifiuta senza accettazione termini", () => {
    const r = registerSchema.safeParse({ ...valid, acceptTerms: false });
    expect(r.success).toBe(false);
  });
  it("rifiuta senza approvazione clausole vessatorie", () => {
    const r = registerSchema.safeParse({ ...valid, acceptVexatious: false });
    expect(r.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("richiede una password non vuota", () => {
    expect(loginSchema.safeParse({ email: "m@x.it", password: "" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "m@x.it", password: "x" }).success).toBe(true);
  });
});

describe("raceSchema", () => {
  it("coerce numerico e default priorità", () => {
    const r = raceSchema.safeParse({ name: "Maratona", distanceKm: "42.195" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.distanceKm).toBeCloseTo(42.195);
      expect(r.data.priority).toBe("A");
    }
  });
  it("rifiuta distanza non positiva", () => {
    expect(raceSchema.safeParse({ name: "X", distanceKm: "-1" }).success).toBe(false);
  });
});

describe("hrZonesSchema", () => {
  it("accetta zone parziali", () => {
    const r = hrZonesSchema.safeParse({ z2: { min: 120, max: 140 } });
    expect(r.success).toBe(true);
  });
});
