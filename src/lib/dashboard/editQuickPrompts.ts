export type EditQuickPromptCategory = "tone" | "length" | "structure" | "angle";

export type EditQuickPrompt = {
  text: string;
  category: EditQuickPromptCategory;
};

export const EDIT_QUICK_PROMPTS: readonly EditQuickPrompt[] = [
  { text: "Make the tone more casual and friendly", category: "tone" },
  { text: "Change to a more professional tone", category: "tone" },
  { text: "Make it shorter and punchier", category: "length" },
  { text: "Add more detail about the main topic", category: "length" },
  { text: "Add a clear call to action at the end", category: "structure" },
  { text: "Regenerate with a different angle", category: "angle" },
] as const;

export function isQuickEditPrompt(message: string): boolean {
  const t = message.trim();
  return EDIT_QUICK_PROMPTS.some((p) => p.text === t);
}
