export function absoluteVideoUrl(url: string, origin: string): string {
  return /^https?:\/\//i.test(url) ? url : `${origin}${url}`;
}
