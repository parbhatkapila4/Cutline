
const PEXELS_SEARCH = "https://api.pexels.com/v1/search";

export type PexelsResult = { url: string } | null;

export async function searchPexels(query: string): Promise<PexelsResult> {
  const key = process.env.PEXELS_API_KEY;
  if (!key?.trim()) {
    return null;
  }
  const url = new URL(PEXELS_SEARCH);
  url.searchParams.set("query", query.slice(0, 200));
  url.searchParams.set("per_page", "1");
  url.searchParams.set("orientation", "landscape");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: key,
      },
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    if (response.status === 400 || response.status === 401 || response.status === 403 || response.status === 404) {
      if (response.status === 401 || response.status === 403) {
        console.warn("[images] Pexels: invalid or missing API key.");
      }
      return null;
    }
    throw new Error(`Pexels failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    photos?: Array<{ src?: { large?: string; medium?: string } }>;
  };
  const first = data.photos?.[0];
  const imageUrl = first?.src?.large ?? first?.src?.medium;
  if (typeof imageUrl !== "string" || !imageUrl) {
    return null;
  }
  return { url: imageUrl };
}


export async function searchPexelsMultiple(query: string, count: number = 10): Promise<string[]> {
  const key = process.env.PEXELS_API_KEY;
  if (!key?.trim()) return [];
  const url = new URL(PEXELS_SEARCH);
  url.searchParams.set("query", query.slice(0, 200));
  url.searchParams.set("per_page", String(Math.min(30, Math.max(1, count))));
  url.searchParams.set("orientation", "landscape");
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json", Authorization: key },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) return [];
    const data = (await response.json()) as { photos?: Array<{ src?: { large?: string; medium?: string } }> };
    const urls: string[] = [];
    for (const p of data.photos ?? []) {
      const u = p?.src?.large ?? p?.src?.medium;
      if (typeof u === "string" && u && !urls.includes(u)) urls.push(u);
    }
    return urls;
  } catch {
    clearTimeout(timeoutId);
    return [];
  }
}
