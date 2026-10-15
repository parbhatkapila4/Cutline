import { captionTextWidthEm } from "@/lib/pipeline/captionMetrics";
import { lineEndWeakness } from "@/remotion/captionLayout";

export const CAPTION_MAX_CHUNK_EM = 17;
export const CAPTION_MAX_CHUNK_WORDS = 7;

const CHUNK_COST = 0.15;
const SHORT_CHUNK_EM = 9;
const BALANCE_WEIGHT = 0.2;
const TRAILING_CLOSERS = /["'\u{201D}\u{2019})\]]+$/u;
const LEADING_OPENERS = /^["'\u{201C}\u{2018}(\[]+/u;
const BOUND_PAIRS = new Set([
  "out of", "such as", "because of", "instead of", "thanks to", "due to", "next to",
  "according to", "close to", "as well", "rather than", "more than", "less than", "kind of",
  "sort of", "lots of",
]);
const CLAUSE_STARTS = new Set([
  "and", "but", "or", "so", "because", "which", "who", "that", "what", "how", "why", "when",
  "while", "where", "if", "then", "to", "with", "for", "from", "at", "in", "on", "by", "before",
  "after", "until", "unless", "since", "although", "though", "whether", "like", "as",
]);

function endsSentence(word: string, next: string | undefined): boolean {
  const bare = word.replace(TRAILING_CLOSERS, "");
  if (/[!?]$/.test(bare)) return true;
  if (!/[.\u{2026}]$/u.test(bare)) return false;
  if (next === undefined) return true;
  if (lineEndWeakness(word) === 2 || /^\p{Lu}\.$/u.test(bare)) return false;
  return /^\p{Lu}|^\p{N}/u.test(next.replace(LEADING_OPENERS, ""));
}
function breakCost(prev: string, next: string, after: string | undefined): number {
  if (/[,;:\u{2026}"\u{201D})\]]$/u.test(prev)) return 0;
  const weakness = lineEndWeakness(prev);
  const nextWord = next.replace(LEADING_OPENERS, "").toLowerCase();
  const pair = `${prev.toLowerCase()} ${nextWord}`;
  const upToAmount = pair === "up to" && /^[\p{N}\p{Sc}]/u.test(after ?? "");
  if (weakness === 2 || BOUND_PAIRS.has(pair) || upToAmount) return 1.5;
  if (CLAUSE_STARTS.has(nextWord)) return 0.1;
  if (weakness === 1) return 0.8;
  if (/\d$/.test(prev) && /^\p{L}/u.test(next)) return 0.7;
  if (/\p{L}{3}ly$/iu.test(prev)) return 0.6;
  return 0.5;
}

function chunkSentence(words: string[]): string[] {
  const n = words.length;
  const widths = words.map(captionTextWidthEm);
  const space = captionTextWidthEm(" ");
  const best: number[] = [0];
  const start: number[] = [0];
  for (let j = 1; j <= n; j++) {
    best[j] = Infinity;
    start[j] = j - 1;
    let width = -space;
    for (let i = j - 1; i >= 0 && j - i <= CAPTION_MAX_CHUNK_WORDS; i--) {
      width += widths[i]! + space;
      if (width > CAPTION_MAX_CHUNK_EM && i < j - 1) break;
      const short = Math.max(0, SHORT_CHUNK_EM - width) / SHORT_CHUNK_EM;
      const slack = Math.max(0, CAPTION_MAX_CHUNK_EM - width) / CAPTION_MAX_CHUNK_EM;
      const cost =
        best[i]! +
        CHUNK_COST +
        short * short +
        BALANCE_WEIGHT * slack * slack +
        (j < n ? breakCost(words[j - 1]!, words[j]!, words[j + 1]) : 0);
      if (cost < best[j]!) {
        best[j] = cost;
        start[j] = i;
      }
    }
  }
  const chunks: string[] = [];
  for (let j = n; j > 0; j = start[j]!) {
    chunks.unshift(words.slice(start[j]!, j).join(" "));
  }
  return chunks;
}

export function chunkCaptionText(text: string): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let sentence: string[] = [];
  words.forEach((word, i) => {
    sentence.push(word);
    if (endsSentence(word, words[i + 1])) {
      chunks.push(...chunkSentence(sentence));
      sentence = [];
    }
  });
  if (sentence.length > 0) chunks.push(...chunkSentence(sentence));
  return chunks;
}
