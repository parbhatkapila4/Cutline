export function applyProgrammaticPlaceholders(
  input: string,
  placeholders?: Record<string, string> | null
): string {
  if (placeholders == null || typeof placeholders !== "object") return input;
  let out = input;
  for (const [k, v] of Object.entries(placeholders)) {
    if (typeof k !== "string" || typeof v !== "string") continue;
    const key = k.trim();
    if (!key) continue;
    out = out.split(`{{${key}}}`).join(v);
  }
  return out;
}
