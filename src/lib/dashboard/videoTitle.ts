const MAX_TITLE_CHARS = 60;
const MIN_SENTENCE_CHARS = 12;
const MIN_WORD_CUT = 24;

export function videoTitleFromPrompt(prompt: string | null | undefined): string {
  if (typeof prompt !== "string") return "";
  const text = prompt.replace(/\s+/g, " ").trim();
  if (!text) return "";
  const sentence = /^(.+?[.!?])(?:\s|$)/.exec(text)?.[1];
  if (sentence && sentence.length >= MIN_SENTENCE_CHARS && sentence.length <= MAX_TITLE_CHARS) {
    return sentence.replace(/\.$/, "");
  }
  if (text.length <= MAX_TITLE_CHARS) return text;
  const cut = text.slice(0, MAX_TITLE_CHARS - 1);
  const space = cut.lastIndexOf(" ");
  const words = space >= MIN_WORD_CUT ? cut.slice(0, space) : cut;
  return `${words.replace(/[\s,;:.\-–—]+$/, "")}…`;
}
