export type EditQuickPromptCategory = "tone" | "length" | "structure" | "angle";

export type EditQuickPrompt = {
  id: "casual" | "professional" | "punchier" | "detail" | "cta" | "angle";
  text: string;
  label: string;
  outcome: string;
  category: EditQuickPromptCategory;
};

export const MAX_EDIT_MESSAGE_CHARS = 280;
export const EDIT_QUICK_PROMPTS: readonly EditQuickPrompt[] = [
  {
    id: "casual",
    text: "Make the tone more casual and friendly",
    label: "More casual",
    outcome: "Warmer voice, contractions, lighter phrasing",
    category: "tone",
  },
  {
    id: "professional",
    text: "Change to a more professional tone",
    label: "More professional",
    outcome: "Crisper, more authoritative wording",
    category: "tone",
  },
  {
    id: "punchier",
    text: "Make it shorter and punchier",
    label: "Punchier",
    outcome: "Tighter lines and a stronger hook, same length",
    category: "length",
  },
  {
    id: "detail",
    text: "Add more detail about the main topic",
    label: "More detail",
    outcome: "Deeper context and a concrete example",
    category: "length",
  },
  {
    id: "cta",
    text: "Add a clear call to action at the end",
    label: "Add a call to action",
    outcome: "One closing line that asks for the next step",
    category: "structure",
  },
  {
    id: "angle",
    text: "Regenerate with a different angle",
    label: "New angle",
    outcome: "A fresh hook and a new way into the story",
    category: "angle",
  },
] as const;

export const EDIT_IDEA_PROMPTS: readonly string[] = [
  "Cut the intro in half and start with a pattern interrupt",
  "Swap the example for a customer win story",
  "Punch up the CTA with a sense of urgency",
  "Reframe the whole thing for a founder audience",
  "Add a surprising stat in the first 5 seconds",
  "End on a question that invites a reply",
];

export function isQuickEditPrompt(message: string): boolean {
  const t = message.trim();
  return EDIT_QUICK_PROMPTS.some((p) => p.text === t);
}
