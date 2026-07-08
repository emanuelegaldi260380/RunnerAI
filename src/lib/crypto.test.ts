import { describe, it, expect, beforeAll } from "vitest";

// chiave di test (32 byte base64) impostata prima dell'import del modulo
beforeAll(() => {
  process.env.ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
});

describe("crypto AES-256-GCM", () => {
  it("round-trip encrypt/decrypt", async () => {
    const { encrypt, decrypt } = await import("./crypto");
    const plain = "password-super-segreta-123";
    const enc = encrypt(plain);
    expect(enc).not.toContain(plain);
    expect(enc.startsWith("v1:")).toBe(true);
    expect(decrypt(enc)).toBe(plain);
  });

  it("un ciphertext manomesso fallisce la decrypt (auth tag)", async () => {
    const { encrypt, decrypt } = await import("./crypto");
    const enc = encrypt("dati");
    const parts = enc.split(":");
    // altera il ciphertext
    parts[3] = Buffer.from("xxxx").toString("base64");
    expect(() => decrypt(parts.join(":"))).toThrow();
  });
});
