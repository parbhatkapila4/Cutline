const DEFAULT_MODEL = "anthropic/claude-haiku-4.5";

export function getModelCandidates(primaryModel: string): string[] {
  const configuredFallbacks = (process.env.OPENROUTER_FALLBACK_MODELS ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);

  const raw = [primaryModel, ...configuredFallbacks, DEFAULT_MODEL];
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const model of raw) {
    if (!seen.has(model)) {
      seen.add(model);
      deduped.push(model);
    }
  }
  return deduped;
}
