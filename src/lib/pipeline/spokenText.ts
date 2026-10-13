const INVISIBLE_RE = /[\u{200B}\u{2060}\u{FEFF}\u{AD}]/gu;
const EMOJI_UNIT = String.raw`(?:(?![\u{A9}\u{AE}\u{2122}])\p{Extended_Pictographic}\u{FE0F}|\p{Emoji_Presentation})`;
const EMOJI_RUN_RE = new RegExp(
  String.raw`\s*${EMOJI_UNIT}(?:${EMOJI_UNIT}|[\u{FE0F}\u{20E3}\u{200D}\u{E0020}-\u{E007F}])*`,
  "gu"
);
const EMOJI_LEFTOVER_RE = /[\u{FE0E}\u{FE0F}\u{20E3}\u{E0020}-\u{E007F}]/gu;
const ORPHAN_ZWJ_RE = /(?<![\p{L}\p{M}])\u{200D}|\u{200D}(?![\p{L}\p{M}])/gu;
const DIGIT_RANGE_RE = /(\d)\s*(?:[\u{2012}-\u{2015}]|-{1,2})\s*(?=\d)/gu;
const JOINING_DASH_RE = /(?<=[\p{L}\p{N}])[\u{2012}\u{2013}](?=[\p{L}\p{N}])/gu;
const CLAUSE_DASH_RE = /\s*(?:[\u{2012}-\u{2015}\u{2E3A}\u{2E3B}]+|-{2,}|(?<=^|\s)-(?=\s|$))\s*/gu;

const TERMINAL_PUNCTUATION = ".,;:!?\u{2026}";
const OPENERS = "([{\u{201C}\u{2018}";
const CLOSERS = ")]}\u{201D}\u{2019}";

function replaceEmojiRun(match: string, offset: number, whole: string): string {
  const before = whole.slice(0, offset).trimEnd();
  const after = whole.slice(offset + match.length);
  if (!before || !after.trim()) return "";
  const next = after.charAt(0);
  if (TERMINAL_PUNCTUATION.includes(next) || CLOSERS.includes(next)) return "";
  return /^\s/.test(after) ? "" : " ";
}

function replaceClauseDash(match: string, offset: number, whole: string): string {
  const before = whole.slice(0, offset).trimEnd();
  const after = whole.slice(offset + match.length).trimStart();
  if (!before || !after) return "";
  const prev = before.charAt(before.length - 1);
  const next = after.charAt(0);
  if (TERMINAL_PUNCTUATION.includes(prev)) return " ";
  if (OPENERS.includes(prev) || /(?:^|\s)["']$/.test(before)) return "";
  if (TERMINAL_PUNCTUATION.includes(next) || CLOSERS.includes(next)) return "";
  if (/^["'](?:$|[\s.,;:!?])/.test(after)) return "";
  return ", ";
}

export function cleanSpokenText(text: string): string {
  return text
    .replace(INVISIBLE_RE, "")
    .replace(EMOJI_RUN_RE, replaceEmojiRun)
    .replace(EMOJI_LEFTOVER_RE, "")
    .replace(ORPHAN_ZWJ_RE, "")
    .replace(/\s+/g, " ")
    .replace(DIGIT_RANGE_RE, "$1-")
    .replace(JOINING_DASH_RE, "-")
    .replace(CLAUSE_DASH_RE, replaceClauseDash)
    .replace(/\s+/g, " ")
    .trim();
}
