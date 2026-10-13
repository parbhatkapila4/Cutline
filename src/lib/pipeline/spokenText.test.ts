import { describe, it, expect } from "vitest";
import { cleanSpokenText } from "./spokenText";

describe("cleanSpokenText: dashes used as punctuation become commas", () => {
  it.each([
    ["It's not just coffee — it's a ritual.", "It's not just coffee, it's a ritual."],
    ["We tried everything—nothing worked.", "We tried everything, nothing worked."],
    ["The results — honestly — surprised us.", "The results, honestly, surprised us."],
    ["Fast – really fast.", "Fast, really fast."],
    ["Wait--what?", "Wait, what?"],
    ["Real talk - this works.", "Real talk, this works."],
    ["Big news ― today.", "Big news, today."],
    ["Three things matter ⸺ speed.", "Three things matter, speed."],
  ])("%s", (input, expected) => {
    expect(cleanSpokenText(input)).toBe(expected);
  });
});

describe("cleanSpokenText: a dash next to other punctuation or an edge is dropped", () => {
  it.each([
    ["— and that's it.", "and that's it."],
    ["I was going to say —", "I was going to say"],
    ["Really? — Yes.", "Really? Yes."],
    ["Wait —!", "Wait!"],
    ["Fine, — whatever.", "Fine, whatever."],
    ["Hold on… — listen.", "Hold on… listen."],
    ["(and — yes — this)", "(and, yes, this)"],
    ["(really —)", "(really)"],
    ['He yelled "stop —" and left.', 'He yelled "stop" and left.'],
    ["“Stop —” she said.", "“Stop” she said."],
    ['He said — "the best" — twice.', 'He said, "the best", twice.'],
    ['"— Hi," she said.', '"Hi," she said.'],
  ])("%s", (input, expected) => {
    expect(cleanSpokenText(input)).toBe(expected);
  });
});

describe("cleanSpokenText: dashes that join words or numbers become hyphens", () => {
  it.each([
    ["Open Mon–Fri.", "Open Mon-Fri."],
    ["From 1990–2000.", "From 1990-2000."],
    ["Shifts run 9 — 5.", "Shifts run 9-5."],
    ["Call 555‒1234.", "Call 555-1234."],
    ["Ages 18 - 24.", "Ages 18-24."],
  ])("%s", (input, expected) => {
    expect(cleanSpokenText(input)).toBe(expected);
  });

  it("leaves ordinary hyphens alone", () => {
    const text = "A state-of-the-art e-mail tool, -5 degrees outside.";
    expect(cleanSpokenText(text)).toBe(text);
  });
});

describe("cleanSpokenText: spaces and invisible characters", () => {
  it("turns no-break and other Unicode spaces into plain spaces", () => {
    expect(cleanSpokenText("Hello\u{A0}world\u{202F}today\u{2009}now\u{3000}ok")).toBe(
      "Hello world today now ok"
    );
  });

  it("collapses runs of whitespace, including newlines, and trims", () => {
    expect(cleanSpokenText("  One line\n\nand   another  ")).toBe("One line and another");
  });

  it("removes zero-width spaces, word joiners, byte-order marks and soft hyphens", () => {
    expect(cleanSpokenText("\u{FEFF}Zero\u{200B}width word\u{2060}joiner soft\u{AD}hyphen")).toBe(
      "Zerowidth wordjoiner softhyphen"
    );
  });

  it("keeps joiners that sit between letters, which some scripts need", () => {
    const persian = "می\u{200C}خواهم";
    const devanagari = "क्\u{200D}ष";
    expect(cleanSpokenText(persian)).toBe(persian);
    expect(cleanSpokenText(devanagari)).toBe(devanagari);
  });
});

describe("cleanSpokenText: emoji have no glyph in the caption font and cannot be spoken", () => {
  it.each([
    ["Let's go 🚀!", "Let's go!"],
    ["🔥 Big news 🔥 today.", "Big news today."],
    ["Love it ❤️ so much.", "Love it so much."],
    ["Family 👩‍👩‍👧 time.", "Family time."],
    ["Thumbs 👍🏽 up.", "Thumbs up."],
    ["Flag 🇺🇸 day.", "Flag day."],
    ["go🚀now", "go now"],
    ["Step 1️⃣ first.", "Step 1 first."],
    ["Done ✅", "Done"],
  ])("%s", (input, expected) => {
    expect(cleanSpokenText(input)).toBe(expected);
  });

  it("keeps the trademark, copyright and registered signs, which the font does have", () => {
    expect(cleanSpokenText("Cutline™ and ©2026 Acme®.")).toBe("Cutline™ and ©2026 Acme®.");
    expect(cleanSpokenText("Cutline™\u{FE0F} rocks.")).toBe("Cutline™ rocks.");
  });
});

describe("cleanSpokenText: characters that already render correctly are left alone", () => {
  it("keeps smart quotes and the ellipsis character", () => {
    const text = "It’s “fine”… really, isn’t it?";
    expect(cleanSpokenText(text)).toBe(text);
  });

  it("returns an empty string when nothing speakable is left", () => {
    expect(cleanSpokenText("")).toBe("");
    expect(cleanSpokenText(" — ")).toBe("");
    expect(cleanSpokenText("🔥🔥")).toBe("");
  });

  it("is idempotent", () => {
    const samples = [
      "It's not just coffee — it's a ritual.",
      'He said — "the best" — twice.',
      "Open Mon–Fri, 9 — 5 🚀!",
      "Hello\u{A0}world — again… ok",
    ];
    for (const s of samples) {
      const once = cleanSpokenText(s);
      expect(cleanSpokenText(once)).toBe(once);
    }
  });
});
