/** Recupera l'immagine di anteprima (og:image / twitter:image) da una pagina web. */
export async function fetchOgImage(url: string): Promise<string | null> {
  if (!url.startsWith("http")) return null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        accept: "text/html",
      },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 250000);
    const m =
      html.match(/<meta[^>]+property=["']og:image(?::url)?["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
    let img = m?.[1] ?? null;
    if (!img) return null;
    if (img.startsWith("//")) img = "https:" + img;
    else if (img.startsWith("/")) img = new URL(url).origin + img;
    return img.startsWith("http") ? img : null;
  } catch {
    return null;
  }
}
