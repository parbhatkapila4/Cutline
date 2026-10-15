export const CAPTION_FONT_WEIGHT = 700;
export const CAPTION_FONT_SIZE_OF_SHORT_SIDE = 0.044;
export const CAPTION_MIN_FONT_SIZE_PX = 16;
export const CAPTION_LINE_HEIGHT_EM = 1.2;
export const CAPTION_PADDING_X_EM = 0.5;
export const CAPTION_PADDING_Y_EM = 0.25;
export const CAPTION_RADIUS_EM = 0.3;
export const CAPTION_BACKGROUND_OPACITY = 0.7;
export const CAPTION_BOTTOM_OF_HEIGHT = 0.09;
export const CAPTION_BOTTOM_OF_HEIGHT_9_16 = 0.15;
export const CAPTION_MAX_WIDTH_OF_WIDTH = 0.88;
export const CAPTION_MAX_LINES = 2;
export const CAPTION_MIN_SCALE = 0.7;

const TITLES = new Set(["mr.", "mrs.", "ms.", "dr.", "prof.", "st.", "no."]);
const STRONG_LINE_ENDS = new Set([
  "a", "an", "the", "this", "these", "those", "that", "my", "your", "his", "her", "its", "our",
  "their", "every", "each", "some", "any", "no", "not", "such",
  "and", "but", "or", "nor", "so", "yet", "because", "if", "when", "while", "although", "though",
  "unless", "since", "until", "whether", "where", "which", "who", "whom", "whose", "what", "how",
  "why",
  "of", "to", "in", "on", "at", "for", "with", "from", "by", "about", "into", "onto", "over",
  "under", "between", "through", "without", "within", "across", "after", "before", "during",
  "like", "than", "via", "per", "as", "&",
]);

const WEAK_LINE_ENDS = new Set([
  "is", "are", "was", "were", "be", "been", "being", "am", "will", "would", "can", "could",
  "should", "may", "might", "must", "shall", "do", "does", "did", "has", "have", "had",
  "i", "we", "you", "they", "he", "she", "it", "there",
  "it's", "that's", "there's", "we're", "you're", "they're", "i'm", "we'll", "you'll", "i'll",
  "don't", "doesn't", "didn't", "can't", "won't", "isn't", "aren't", "wasn't", "weren't",
  "very", "more", "most", "less",
]);
export function lineEndWeakness(word: string): 0 | 1 | 2 {
  const w = word.toLowerCase().replace(/\u{2019}/gu, "'");
  if (TITLES.has(w)) return 2;
  if (/[,.;:!?\u{2026}"\u{201D})\]]$/u.test(w)) return 0;
  if (STRONG_LINE_ENDS.has(w)) return 2;
  if (WEAK_LINE_ENDS.has(w)) return 1;
  return 0;
}

export type CaptionFrame = { width: number; height: number };
export type MeasureCaptionText = (text: string, fontSizePx: number) => number;

export type CaptionLayout = {
  lines: string[];
  fontSizePx: number;
  lineHeightPx: number;
  paddingXPx: number;
  paddingYPx: number;
  radiusPx: number;
  bottomPx: number;
  textWidthPx: number;
};

export function captionFontSizePx(frame: CaptionFrame): number {
  return Math.max(
    CAPTION_MIN_FONT_SIZE_PX,
    Math.round(Math.min(frame.width, frame.height) * CAPTION_FONT_SIZE_OF_SHORT_SIDE)
  );
}


function captionBottomPx(frame: CaptionFrame): number {
  const nineBySixteen = Math.abs(frame.width / frame.height - 9 / 16) < 0.01;
  const fraction = nineBySixteen ? CAPTION_BOTTOM_OF_HEIGHT_9_16 : CAPTION_BOTTOM_OF_HEIGHT;
  return Math.round(frame.height * fraction);
}


export function captionLineCapacityEm(frame: CaptionFrame): number {
  const base = captionFontSizePx(frame);
  return (frame.width * CAPTION_MAX_WIDTH_OF_WIDTH) / base - 2 * CAPTION_PADDING_X_EM;
}

export function layoutCaption(
  text: string,
  frame: CaptionFrame,
  measure: MeasureCaptionText
): CaptionLayout {
  const base = captionFontSizePx(frame);
  const words = text.trim().split(/\s+/).filter(Boolean);
  const maxPillPx = frame.width * CAPTION_MAX_WIDTH_OF_WIDTH;
  const widthOf = (t: string): number => {
    const w = measure(t, base);
    return Number.isFinite(w) && w >= 0 ? w : t.length * base * 0.6;
  };
  const scaleToFit = (widest: number) => maxPillPx / (widest + 2 * CAPTION_PADDING_X_EM * base);
  const build = (lines: string[], scale: number): CaptionLayout => {
    const fontSizePx = base * scale;
    return {
      lines,
      fontSizePx,
      lineHeightPx: fontSizePx * CAPTION_LINE_HEIGHT_EM,
      paddingXPx: fontSizePx * CAPTION_PADDING_X_EM,
      paddingYPx: fontSizePx * CAPTION_PADDING_Y_EM,
      radiusPx: fontSizePx * CAPTION_RADIUS_EM,
      bottomPx: captionBottomPx(frame),
      textWidthPx: Math.max(0, ...lines.map(widthOf)) * scale,
    };
  };

  if (words.length === 0) return build([], 1);
  const single = words.join(" ");
  const singleWidth = widthOf(single);
  if (scaleToFit(singleWidth) >= 1) return build([single], 1);

  if (words.length > 1) {
    const splits: Array<{ lines: string[]; widest: number; cost: number }> = [];
    for (let k = 1; k < words.length; k++) {
      const top = words.slice(0, k).join(" ");
      const bottom = words.slice(k).join(" ");
      const widest = Math.max(widthOf(top), widthOf(bottom));
      splits.push({ lines: [top, bottom], widest, cost: widest + lineEndWeakness(words[k - 1]!) * base });
    }
    const fitting = splits.filter((s) => scaleToFit(s.widest) >= 1);
    if (fitting.length > 0) {
      return build(fitting.reduce((a, b) => (b.cost < a.cost ? b : a)).lines, 1);
    }
    const tightest = splits.reduce((a, b) => (b.widest < a.widest ? b : a));
    const scale = scaleToFit(tightest.widest);
    if (scale >= CAPTION_MIN_SCALE) return build(tightest.lines, scale);
  } else {
    const scale = scaleToFit(singleWidth);
    if (scale >= CAPTION_MIN_SCALE) return build([single], scale);
  }

  const limit = maxPillPx / CAPTION_MIN_SCALE - 2 * CAPTION_PADDING_X_EM * base;
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (widthOf(candidate) <= limit) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = "";
    if (widthOf(word) <= limit) {
      line = word;
      continue;
    }
    for (const ch of word) {
      if (line && widthOf(line + ch) > limit) {
        lines.push(line);
        line = ch;
      } else {
        line += ch;
      }
    }
  }
  if (line) lines.push(line);
  return build(lines, CAPTION_MIN_SCALE);
}
