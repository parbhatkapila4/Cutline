const UNSPLASH_SEARCH = "https://api.unsplash.com/search/photos";

export type UnsplashResult = { url: string } | null;
export type UnsplashOrientation = "landscape" | "portrait" | "squarish";

function pickHighRes(
  urls: { raw?: string; full?: string; regular?: string } | undefined,
  orientation: UnsplashOrientation
): string | null {
  if (!urls) return null;
  const dimensions =
    orientation === "portrait"
      ? "w=2160&h=3840"
      : orientation === "squarish"
        ? "w=2160&h=2160"
        : "w=3840&h=2160";
  if (typeof urls.raw === "string" && urls.raw) {
    const sep = urls.raw.includes("?") ? "&" : "?";
    return `${urls.raw}${sep}${dimensions}&q=92&fm=jpg&fit=crop`;
  }
  if (typeof urls.full === "string" && urls.full) return urls.full;
  if (typeof urls.regular === "string" && urls.regular) return urls.regular;
  return null;
}

export async function searchUnsplash(
  query: string,
  orientation: UnsplashOrientation = "landscape"
): Promise<UnsplashResult> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key?.trim()) {
    return null;
  }
  const url = new URL(UNSPLASH_SEARCH);
  url.searchParams.set("query", query.slice(0, 200));
  url.searchParams.set("per_page", "1");
  url.searchParams.set("orientation", orientation);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Client-ID ${key}`,
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
        console.warn("[images] Unsplash: invalid or missing API key.");
      }
      return null;
    }
    throw new Error(`Unsplash failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    results?: Array<{ urls?: { raw?: string; full?: string; regular?: string } }>;
  };
  const first = data.results?.[0];
  const imageUrl = pickHighRes(first?.urls, orientation);
  if (typeof imageUrl !== "string" || !imageUrl) {
    return null;
  }
  return { url: imageUrl };
}

export async function searchUnsplashMultiple(
  query: string,
  count: number = 10,
  orientation: UnsplashOrientation = "landscape"
): Promise<string[]> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key?.trim()) return [];
  const url = new URL(UNSPLASH_SEARCH);
  url.searchParams.set("query", query.slice(0, 200));
  url.searchParams.set("per_page", String(Math.min(30, Math.max(1, count))));
  url.searchParams.set("orientation", orientation);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json", Authorization: `Client-ID ${key}` },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) return [];
    const data = (await response.json()) as {
      results?: Array<{ urls?: { raw?: string; full?: string; regular?: string } }>;
    };
    const urls: string[] = [];
    for (const r of data.results ?? []) {
      const u = pickHighRes(r?.urls, orientation);
      if (typeof u === "string" && u && !urls.includes(u)) urls.push(u);
    }
    return urls;
  } catch {
    clearTimeout(timeoutId);
    return [];
  }
}
