const STRATEGIES = [
  "educational",
  "high_energy",
  "storytelling",
  "minimal",
  "promotional",
] as const;

export function getVariationStrategy(index: number): string {
  const i = Math.max(0, Math.floor(index));
  return STRATEGIES[i % STRATEGIES.length] ?? STRATEGIES[0];
}

export function getVariationPromptSnippet(
  strategy: string,
  context: "narrative" | "script"
): string {
  const s = strategy.toLowerCase();
  if (context === "narrative") {
    if (s === "educational") return " This is the educational variant: focus on clarity, step-by-step explanation, and steady pacing.";
    if (s === "high_energy") return " This is the high-energy variant: open with a strong hook, use faster pacing and energetic beats.";
    if (s === "storytelling") return " This is the storytelling variant: create a narrative arc with emotional pacing and a satisfying payoff.";
    if (s === "minimal") return " This is the minimal variant: keep it concise, minimal tone, no fluff.";
    if (s === "promotional") return " This is the promotional variant: punchy, CTA-focused, persuasive beats.";
  }
  if (context === "script") {
    if (s === "educational") return " This is the educational variant: use clear, explanatory language and steady pacing.";
    if (s === "high_energy") return " This is the high-energy variant: strong opening hook, energetic delivery, faster pacing.";
    if (s === "storytelling") return " This is the storytelling variant: narrative arc, emotional resonance, engaging delivery.";
    if (s === "minimal") return " This is the minimal variant: concise, minimal tone, no filler.";
    if (s === "promotional") return " This is the promotional variant: punchy, CTA-focused, persuasive copy.";
  }
  return "";
}
