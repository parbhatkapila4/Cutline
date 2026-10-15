const UNITS_PER_EM = 2048;
const ASCII_ADVANCE = [
  569, 682, 971, 1139, 1139, 1821, 1479, 487, 682, 682, 797, 1196, 569, 682, 569, 569,
  1139, 1139, 1139, 1139, 1139, 1139, 1139, 1139, 1139, 1139, 682, 682, 1196, 1196, 1196, 1251,
  1997, 1479, 1479, 1479, 1479, 1366, 1251, 1593, 1479, 569, 1139, 1479, 1251, 1706, 1479, 1593,
  1366, 1593, 1479, 1366, 1251, 1479, 1366, 1933, 1366, 1366, 1251, 682, 569, 682, 1196, 1139,
  682, 1139, 1251, 1139, 1251, 1139, 682, 1251, 1251, 569, 569, 1139, 569, 1821, 1251, 1251,
  1251, 1251, 797, 1139, 682, 1251, 1139, 1593, 1139, 1139, 1024, 797, 573, 797, 1196,
];
const LATIN1_ADVANCE = [
  569, 682, 1139, 1139, 1139, 1139, 573, 1139, 682, 1509, 758, 1139, 1196, 682, 1509, 1131,
  819, 1124, 682, 682, 682, 1180, 1139, 569, 682, 682, 748, 1139, 1708, 1708, 1708, 1251,
  1479, 1479, 1479, 1479, 1479, 1479, 2048, 1479, 1366, 1366, 1366, 1366, 569, 569, 569, 569,
  1479, 1479, 1593, 1593, 1593, 1593, 1593, 1196, 1593, 1479, 1479, 1479, 1479, 1366, 1366, 1251,
  1139, 1139, 1139, 1139, 1139, 1139, 1821, 1139, 1139, 1139, 1139, 1139, 569, 569, 569, 569,
  1251, 1251, 1251, 1251, 1251, 1251, 1251, 1124, 1251, 1251, 1251, 1251, 1251, 1139, 1251, 1139,
];

const PUNCTUATION_ADVANCE: Record<number, number> = {
  0x2013: 1139,
  0x2014: 2048,
  0x2018: 569,
  0x2019: 569,
  0x201c: 1024,
  0x201d: 1024,
  0x2022: 717,
  0x2026: 2048,
  0x20ac: 1139,
  0x2122: 2048,
};

const FALLBACK_ADVANCE = 1251;
export const CAPTION_FONT_CELL_EM = (1854 + 434) / UNITS_PER_EM;

function tableAdvance(cp: number): number | undefined {
  if (cp >= 0x20 && cp <= 0x7e) return ASCII_ADVANCE[cp - 0x20];
  if (cp >= 0xa0 && cp <= 0xff) return LATIN1_ADVANCE[cp - 0xa0];
  return PUNCTUATION_ADVANCE[cp];
}

function isZeroWidth(cp: number): boolean {
  return (
    (cp >= 0x300 && cp <= 0x36f) ||
    (cp >= 0x200b && cp <= 0x200f) ||
    cp === 0x2060 ||
    cp === 0xfeff
  );
}

export function captionTextWidthEm(text: string): number {
  let units = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    let advance = tableAdvance(cp);
    if (advance === undefined && isZeroWidth(cp)) advance = 0;
    if (advance === undefined) {
      const base = ch.normalize("NFD").codePointAt(0)!;
      if (base !== cp) advance = tableAdvance(base);
    }
    units += advance ?? FALLBACK_ADVANCE;
  }
  return units / UNITS_PER_EM;
}
