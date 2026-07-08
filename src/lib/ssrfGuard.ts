import dns from "dns/promises";
import net from "net";

// Protezione SSRF: prima di fare fetch verso un URL esterno controllato da
// terzi (es. og:image di pagine web), verifica che host e IP risolti non siano
// interni/riservati (loopback, link-local, metadata cloud 169.254.169.254,
// range privati). Riduce il rischio che un URL malevolo faccia raggiungere al
// server risorse della rete interna.
//
// NB: resta un residuo TOCTOU (DNS rebinding tra lookup e fetch); accettabile
// per l'uso attuale (URL da motori di ricerca, non input utente diretto).

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const p = ip.split(".").map(Number);
    if (p[0] === 0 || p[0] === 10 || p[0] === 127) return true;
    if (p[0] === 169 && p[1] === 254) return true; // link-local + metadata cloud
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
    if (p[0] === 192 && p[1] === 168) return true;
    if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true; // CGNAT
    if (p[0] >= 224) return true; // multicast / riservati
    return false;
  }
  const v = ip.toLowerCase();
  if (v === "::1" || v === "::") return true;
  if (v.startsWith("fe80")) return true; // link-local
  if (v.startsWith("fc") || v.startsWith("fd")) return true; // ULA
  if (v.startsWith("::ffff:")) return isPrivateIp(v.slice(7)); // IPv4-mapped
  return false;
}

/**
 * Valida un URL http(s) pubblico; lancia se lo schema non è consentito o se
 * l'host risolve a un indirizzo interno/riservato.
 */
export async function assertPublicHttpUrl(raw: string): Promise<URL> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error("URL non valido");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("Schema non consentito (solo http/https)");
  }
  const host = u.hostname;
  if (net.isIP(host) && isPrivateIp(host)) {
    throw new Error("Host interno non consentito");
  }
  const addrs = await dns.lookup(host, { all: true });
  if (addrs.length === 0 || addrs.some((a) => isPrivateIp(a.address))) {
    throw new Error("Host risolve a un indirizzo interno");
  }
  return u;
}

/** true se l'URL è pubblico e sicuro da fetchare, false altrimenti (no throw). */
export async function isPublicHttpUrl(raw: string): Promise<boolean> {
  try {
    await assertPublicHttpUrl(raw);
    return true;
  } catch {
    return false;
  }
}
