import fs from "fs";
import path from "path";
const TOKENS_ESTIMATE = {
  intent: 400,
  narrative: 600,
  shots: 800,
  script: 1000,
  assetAnalysis: 500,
  imageQueryPerShot: 300,
  scriptExtend: 400,
} as const;


const VEO_CHUNK_SECONDS = 8;
const VEO_SECONDS_PER_CALL = 8;
const SHOTS_MIN = 4;
const SHOTS_MAX = 12;
const DURATION_MIN = 10;
const DURATION_MAX = 60;

type Mode = "avatar" | "non-avatar";

type Profile = {
  videosPerMonth: number;
  avatarSplit: number; // 0..1
  avgSeconds: number;
  shots: number;
  dalleShare: number;
  charsPerSecond: number;
  variations: number;
};

const DEFAULT_PROFILE: Profile = {
  videosPerMonth: 100,
  avatarSplit: 0.2,
  avgSeconds: 30,
  shots: 6,
  dalleShare: 0.0,
  charsPerSecond: 15,
  variations: 1,
};

type UnitKey =
  | "openrouter.llm_per_1k_tokens"
  | "openai.image_generation"
  | "elevenlabs.tts_per_second"
  | "elevenlabs.tts_per_character"
  | "google_veo.video_per_second"
  | "heygen.avatar_video_generation"
  | "unsplash.image_search_request"
  | "pexels.image_search_request"
  | "vercel_blob.storage_gb_month"
  | "vercel_blob.bandwidth_gb"
  | "worker_host.cpu_second"
  | "upstash_redis.command"
  | "neon_postgres.compute_hour";

type UsageRow = { unit: UnitKey; qty: number; why: string };

function unitsForJob(mode: Mode, p: Profile): UsageRow[] {
  const rows: UsageRow[] = [];
  const v = Math.max(1, p.variations);

  const perVariationTokens =
    TOKENS_ESTIMATE.intent +
    TOKENS_ESTIMATE.narrative +
    TOKENS_ESTIMATE.shots +
    TOKENS_ESTIMATE.script +
    (mode === "non-avatar" ? TOKENS_ESTIMATE.imageQueryPerShot * p.shots : 0);
  rows.push({
    unit: "openrouter.llm_per_1k_tokens",
    qty: (perVariationTokens * v) / 1000,
    why:
      `intent 400 + narrative 600 + shots 800 + script 1000` +
      (mode === "non-avatar" ? ` + imageQuery 300x${p.shots}` : "") +
      ` = ${perVariationTokens} tok x ${v} variation(s) (orchestrator.ts:76-84, :1627)`,
  });

  rows.push({
    unit: "elevenlabs.tts_per_second",
    qty: p.avgSeconds * v,
    why: `${p.avgSeconds}s narration x ${v} (recordTtsSeconds, orchestrator.ts:885/:1530)`,
  });
  rows.push({
    unit: "elevenlabs.tts_per_character",
    qty: p.avgSeconds * p.charsPerSecond * v,
    why: `${p.avgSeconds}s x ${p.charsPerSecond} chars/s x ${v} — the unit ElevenLabs actually bills`,
  });

  if (mode === "non-avatar") {
    const paidImages = p.shots * p.dalleShare * v;
    rows.push({
      unit: "openai.image_generation",
      qty: paidImages,
      why: `${p.shots} shots x ${(p.dalleShare * 100).toFixed(0)}% DALL-E fallthrough x ${v} (images/source.ts chain; generate.ts:18-22 pins 1792x1024 hd)`,
    });
    rows.push({
      unit: "unsplash.image_search_request",
      qty: p.shots * v,
      why: `first link in the fallback chain, one request per shot`,
    });
    rows.push({
      unit: "pexels.image_search_request",
      qty: p.shots * p.dalleShare * v,
      why: `only attempted when Unsplash misses`,
    });
  } else {
    const chunks = Math.max(1, Math.ceil(p.avgSeconds / VEO_CHUNK_SECONDS));
    rows.push({
      unit: "google_veo.video_per_second",
      qty: chunks * VEO_SECONDS_PER_CALL * v,
      why: `ceil(${p.avgSeconds}/${VEO_CHUNK_SECONDS}) = ${chunks} calls x ${VEO_SECONDS_PER_CALL}s x ${v} (veo/index.ts:125, pricing.ts:16)`,
    });
    rows.push({
      unit: "heygen.avatar_video_generation",
      qty: 1 * v,
      why: `photo-avatar lip-sync path (lipsync/heygen.ts) — unit and price both UNKNOWN`,
    });
  }

  rows.push({
    unit: "worker_host.cpu_second",
    qty: NaN,
    why: `render wall-clock is UNKNOWN from the code (renderVideo.ts:124-158 allows up to 600s)`,
  });
  rows.push({
    unit: "vercel_blob.storage_gb_month",
    qty: NaN,
    why: `output file size is UNKNOWN (MAX_VIDEO_OUTPUT_MB unset by default, config/limits.ts:13-19)`,
  });
  rows.push({
    unit: "vercel_blob.bandwidth_gb",
    qty: NaN,
    why: `scales with views, not renders`,
  });

  return rows;
}

type PriceEntry = {
  unit?: string;
  verifiedPriceUsd: number | null;
  codeAssumedPriceUsd?: number | null;
  codeAssumptionSource?: string;
  TODO?: string;
  notes?: string;
};

type PriceBook = {
  meta?: { pricesVerified?: boolean };
  vendors: Record<string, { displayName?: string; units: Record<string, PriceEntry> }>;
};

function loadPrices(): PriceBook {
  const p = path.resolve(process.cwd(), "config", "vendor-prices.json");
  if (!fs.existsSync(p)) {
    console.error(`\nERROR: ${p} not found. This script cannot run without it.\n`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(p, "utf8")) as PriceBook;
}

function lookup(book: PriceBook, key: UnitKey): PriceEntry | null {
  const [vendor, unit] = key.split(".");
  return book.vendors?.[vendor]?.units?.[unit] ?? null;
}

type Priced = {
  row: UsageRow;
  entry: PriceEntry | null;
  rate: number | null;
  rateSource: "verified" | "code-assumption" | "none";
  cost: number | null;
  qtyUnknown: boolean;
};

function priceRows(rows: UsageRow[], book: PriceBook, useCode: boolean): Priced[] {
  return rows.map((row) => {
    const entry = lookup(book, row.unit);
    const qtyUnknown = !Number.isFinite(row.qty);
    let rate: number | null = null;
    let rateSource: Priced["rateSource"] = "none";

    if (entry) {
      if (typeof entry.verifiedPriceUsd === "number") {
        rate = entry.verifiedPriceUsd;
        rateSource = "verified";
      } else if (useCode && typeof entry.codeAssumedPriceUsd === "number") {
        rate = entry.codeAssumedPriceUsd;
        rateSource = "code-assumption";
      }
    }
    const cost = rate !== null && !qtyUnknown ? rate * row.qty : null;
    return { row, entry, rate, rateSource, cost, qtyUnknown };
  });
}

const BAR = "=".repeat(78);

function money(n: number): string {
  return `$${n.toFixed(n < 1 ? 4 : 2)}`;
}

function renderMode(label: string, priced: Priced[]): number {
  console.log(`\n  ${label}`);
  console.log(`  ${"-".repeat(74)}`);
  console.log(
    `  ${"unit".padEnd(38)}${"qty".padStart(10)}${"rate".padStart(11)}${"cost".padStart(11)}`
  );
  let known = 0;
  for (const p of priced) {
    const qty = p.qtyUnknown ? "UNKNOWN" : p.row.qty.toFixed(p.row.qty < 10 ? 3 : 1);
    const rate = p.rate === null ? "NO PRICE" : p.rate.toFixed(5);
    const cost = p.cost === null ? "--" : money(p.cost);
    const flag = p.rate === null || p.qtyUnknown ? " !" : "  ";
    console.log(`${flag}${p.row.unit.padEnd(38)}${qty.padStart(10)}${rate.padStart(11)}${cost.padStart(11)}`);
    if (p.cost !== null) known += p.cost;
  }
  console.log(`  ${"-".repeat(74)}`);
  console.log(`  ${"PARTIAL TOTAL (priced units only)".padEnd(38)}${"".padStart(21)}${money(known).padStart(11)}`);
  return known;
}

function warnBlock(priced: Priced[], useCode: boolean): { missingPrice: Priced[]; missingQty: Priced[] } {
  const missingPrice = priced.filter((p) => p.rate === null);
  const missingQty = priced.filter((p) => p.qtyUnknown);
  return { missingPrice, missingQty };
}

function main(): void {
  const argv = process.argv.slice(2);
  const arg = (name: string): string | undefined => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const flag = (name: string): boolean => argv.includes(`--${name}`);

  const useCode = flag("use-code-assumptions");
  const asJson = flag("json");

  const p: Profile = {
    videosPerMonth: Number(arg("videos-per-month") ?? DEFAULT_PROFILE.videosPerMonth),
    avatarSplit: Number(arg("avatar-split") ?? DEFAULT_PROFILE.avatarSplit),
    avgSeconds: Number(arg("avg-seconds") ?? DEFAULT_PROFILE.avgSeconds),
    shots: Number(arg("shots") ?? DEFAULT_PROFILE.shots),
    dalleShare: Number(arg("dalle-share") ?? DEFAULT_PROFILE.dalleShare),
    charsPerSecond: Number(arg("chars-per-second") ?? DEFAULT_PROFILE.charsPerSecond),
    variations: Number(arg("variations") ?? DEFAULT_PROFILE.variations),
  };

  if (p.shots < SHOTS_MIN || p.shots > SHOTS_MAX) {
    console.error(`\nERROR: --shots must be ${SHOTS_MIN}..${SHOTS_MAX} (src/lib/pipeline/shots.ts:93-94)\n`);
    process.exit(1);
  }
  if (p.avgSeconds < DURATION_MIN || p.avgSeconds > DURATION_MAX) {
    console.error(
      `\nWARNING: --avg-seconds ${p.avgSeconds} is outside the UI clamp ${DURATION_MIN}..${DURATION_MAX} ` +
      `(src/lib/validation/duration.ts:1-2). Continuing; the server max is higher.\n`
    );
  }

  const book = loadPrices();
  const nonAvatar = priceRows(unitsForJob("non-avatar", p), book, useCode);
  const avatar = priceRows(unitsForJob("avatar", p), book, useCode);

  const nonAvatarJobs = Math.round(p.videosPerMonth * (1 - p.avatarSplit));
  const avatarJobs = p.videosPerMonth - nonAvatarJobs;

  if (asJson) {
    const strip = (rows: Priced[]) =>
      rows.map((r) => ({
        unit: r.row.unit,
        qty: Number.isFinite(r.row.qty) ? r.row.qty : null,
        rate: r.rate,
        rateSource: r.rateSource,
        cost: r.cost,
        why: r.row.why,
      }));
    console.log(
      JSON.stringify(
        {
          complete: false,
          provisional: useCode,
          profile: p,
          nonAvatar: strip(nonAvatar),
          avatar: strip(avatar),
        },
        null,
        2
      )
    );
    return;
  }

  console.log(`\n${BAR}`);
  console.log("  CUTLINE VENDOR COST MODEL");
  console.log(BAR);
  console.log(`  profile: ${p.videosPerMonth} videos/month | avatar split ${(p.avatarSplit * 100).toFixed(0)}%`);
  console.log(`           ${p.avgSeconds}s average | ${p.shots} shots | ${p.variations} variation(s)`);
  console.log(`           DALL-E fallthrough ${(p.dalleShare * 100).toFixed(0)}% | ${p.charsPerSecond} chars/s narration`);
  console.log(`  prices:  ${useCode ? "code assumptions (PROVISIONAL)" : "verified only"}`);

  const naCost = renderMode(`NON-AVATAR (slideshow) — ${nonAvatarJobs} jobs/month`, nonAvatar);
  const avCost = renderMode(`AVATAR (talking_object) — ${avatarJobs} jobs/month`, avatar);

  const monthly = naCost * nonAvatarJobs + avCost * avatarJobs;

  console.log(`\n${BAR}`);
  console.log("  MONTHLY");
  console.log(BAR);
  console.log(`  non-avatar   ${String(nonAvatarJobs).padStart(5)} x ${money(naCost).padStart(9)}  = ${money(naCost * nonAvatarJobs).padStart(10)}`);
  console.log(`  avatar       ${String(avatarJobs).padStart(5)} x ${money(avCost).padStart(9)}  = ${money(avCost * avatarJobs).padStart(10)}`);
  console.log(`  ${"-".repeat(74)}`);
  console.log(`  PARTIAL MONTHLY TOTAL                            ${money(monthly).padStart(10)}`);

  const all = [...nonAvatar, ...avatar];
  const { missingPrice, missingQty } = warnBlock(all, useCode);
  const uniqMissing = [...new Set(missingPrice.map((m) => m.row.unit))];
  const uniqQty = [...new Set(missingQty.map((m) => m.row.unit))];

  console.log(`\n${"!".repeat(78)}`);
  console.log("  THIS TOTAL IS NOT COMPLETE. DO NOT QUOTE IT AS A COST OF GOODS.");
  console.log("!".repeat(78));

  if (uniqMissing.length) {
    console.log(`\n  ${uniqMissing.length} unit(s) have NO PRICE and contributed $0.00 to the totals above:`);
    for (const u of uniqMissing) {
      const e = lookup(book, u as UnitKey);
      console.log(`    - ${u}`);
      if (e?.TODO) console.log(`        TODO: ${e.TODO}`);
    }
  }
  if (uniqQty.length) {
    console.log(`\n  ${uniqQty.length} unit(s) have an UNKNOWN QUANTITY and cannot be costed at any price:`);
    for (const u of uniqQty) {
      const row = all.find((r) => r.row.unit === u);
      console.log(`    - ${u}`);
      if (row) console.log(`        why: ${row.row.why}`);
    }
  }

  if (useCode) {
    console.log(
      `\n  PROVISIONAL: figures above use codeAssumedPriceUsd from config/vendor-prices.json,\n` +
      `  i.e. the constants in src/lib/cost/pricing.ts. Those have NOT been checked against\n` +
      `  any vendor rate card. Treat them as the product's current belief, not as fact.`
    );
  } else {
    console.log(
      `\n  Every verifiedPriceUsd in config/vendor-prices.json is null, so the totals above\n` +
      `  are ${money(0)} plus whatever you filled in. Run with --use-code-assumptions for a\n` +
      `  provisional figure, or fill in verifiedPriceUsd to get a real one.`
    );
  }
  console.log(
    `\n  Also excluded from every total: HeyGen spend (no price and no unit), worker render\n` +
    `  compute, blob storage and egress. See docs/cost-audit.md.\n`
  );
}

main();
