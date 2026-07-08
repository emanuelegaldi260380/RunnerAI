// Media dimostrativi per gli esercizi.
// - Per gli esercizi presenti nella libreria curata mostriamo un video YouTube
//   incorporato IN-APP (embed).
// - Per gli altri, un link di ricerca YouTube sempre pertinente.
//
// La libreria è facilmente estendibile: aggiungi coppie nome->id video YouTube.

const CURATED: Record<string, string> = {
  // esempi (id video YouTube). Aggiungi/verifica i tuoi preferiti:
  // "squat": "aclHkVaku9U",
  // "affondi": "QOVaHwm-Q6U",
  // "plank": "pSHjTRCQxIw",
};

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

/** Ritorna l'id YouTube per l'embed in-app, se disponibile nella libreria curata */
export function embedIdFor(name: string): string | null {
  const key = normalize(name);
  if (CURATED[key]) return CURATED[key];
  const hit = Object.keys(CURATED).find((k) => key.includes(k) || k.includes(key));
  return hit ? CURATED[hit] : null;
}

/** URL di ricerca YouTube per la dimostrazione dell'esercizio */
export function youtubeSearch(name: string): string {
  const q = encodeURIComponent(`${name} esercizio corsa tecnica dimostrazione`);
  return `https://www.youtube.com/results?search_query=${q}`;
}
