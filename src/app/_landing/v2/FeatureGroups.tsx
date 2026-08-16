"use client";

import { useState } from "react";
import {
  AccordionList,
  Container,
  Eyebrow,
  Section,
  SectionHeading,
  type AccordionItem,
} from "./primitives";
type MockRow = { label: string; value: string; accent?: boolean };
type Mock =
  | { kind: "rows"; heading: string; rows: MockRow[] }
  | { kind: "chips"; heading: string; chips: string[] };

type FeatureItem = AccordionItem & { mock: Mock };

type FeatureGroup = {
  id: string;
  eyebrow: string;
  heading: string;
  pastel: string;
  items: FeatureItem[];
};

const GROUPS: FeatureGroup[] = [
  {
    id: "write",
    eyebrow: "01 · Write",
    heading: "Scripts that hook.",
    pastel: "#d9e2d4",
    items: [
      {
        id: "script-engine",
        title: "AI Script Engine",
        body: "A fast, intelligent script engine built for content speed - auto-generate narratives, structure, and pacing with zero friction.",
        linkHref: "/features",
        linkLabel: "Learn more",
        mock: {
          kind: "rows",
          heading: "script.outline",
          rows: [
            { label: "hook", value: "0:00" },
            { label: "setup", value: "0:04" },
            { label: "payoff", value: "0:18" },
            { label: "recap", value: "0:26" },
            { label: "cta", value: "0:30" },
          ],
        },
      },
      {
        id: "conversion-copy",
        title: "Copy tuned for conversion",
        body: "Ad scripts, landing narratives, and product demos written on brand and on message - with hooks front-loaded where they earn attention.",
        linkHref: "/features",
        linkLabel: "Learn more",
        mock: {
          kind: "chips",
          heading: "copy.presets",
          chips: [
            "Ad script",
            "Landing narrative",
            "Product demo",
            "Hook-first",
            "On-brand tone",
          ],
        },
      },
      {
        id: "rewrites",
        title: "Rewrites that teach",
        body: "Inline AI hints tighten hooks, add recaps, and match tone - each suggestion tied to why it lifts retention.",
        linkHref: "/features",
        linkLabel: "Learn more",
        mock: {
          kind: "rows",
          heading: "ai.hints",
          rows: [
            { label: "tighten hook", value: "lifts retention" },
            { label: "add recap", value: "re-hooks drop-off" },
            { label: "match tone", value: "brand voice" },
            { label: "shorten cta", value: "clearer ask" },
          ],
        },
      },
    ],
  },
  {
    id: "look",
    eyebrow: "02 · Look",
    heading: "Visuals on brand.",
    pastel: "#e3ddf1",
    items: [
      {
        id: "visual-intelligence",
        title: "Visual Intelligence",
        body: "Smart image sourcing from the web, AI generation, or your uploads - matched to each scene automatically.",
        linkHref: "/features",
        linkLabel: "Learn more",
        mock: {
          kind: "rows",
          heading: "scene.matching",
          rows: [
            { label: "scene 01", value: "web source" },
            { label: "scene 02", value: "ai generated" },
            { label: "scene 03", value: "your upload" },
            { label: "scene 04", value: "web source" },
          ],
        },
      },
      {
        id: "brand-kits",
        title: "Brand kits",
        body: "Lock your palette, logo, and look once - every render stays on brand without a design pass.",
        linkHref: "/features",
        linkLabel: "Learn more",
        mock: {
          kind: "rows",
          heading: "brand.kit",
          rows: [
            { label: "palette", value: "locked" },
            { label: "logo", value: "logo.svg" },
            { label: "typography", value: "locked" },
            { label: "look", value: "preset 01" },
          ],
        },
      },
      {
        id: "asset-library",
        title: "Asset library",
        body: "Centralize client assets, licensed footage, and AI-generated visuals in one searchable workspace.",
        linkHref: "/features",
        linkLabel: "Learn more",
        mock: {
          kind: "rows",
          heading: "assets.search",
          rows: [
            { label: "client_broll_04.mp4", value: "client" },
            { label: "stock_city_11.mov", value: "licensed" },
            { label: "gen_scene_02.png", value: "ai" },
            { label: "voiceover_v3.wav", value: "upload" },
          ],
        },
      },
    ],
  },
  {
    id: "ship",
    eyebrow: "03 · Ship",
    heading: "Every format, one click.",
    pastel: "#f0dcc8",
    items: [
      {
        id: "multi-format",
        title: "Multi-format export",
        body: "Reels, TikTok, Shorts, Stories, YouTube, LinkedIn - sized and formatted in a single run, no manual cropping.",
        linkHref: "/features",
        linkLabel: "Learn more",
        mock: {
          kind: "chips",
          heading: "export.formats",
          chips: [
            "Reels 9:16",
            "TikTok 9:16",
            "Shorts 9:16",
            "YouTube 16:9",
            "LinkedIn 1:1",
          ],
        },
      },
      {
        id: "auto-captions",
        title: "Auto captions",
        body: "Accurate, styled captions burned in or exported - including SDH and word-timed karaoke styles.",
        linkHref: "/features",
        linkLabel: "Learn more",
        mock: {
          kind: "rows",
          heading: "captions.style",
          rows: [
            { label: "style", value: "karaoke" },
            { label: "mode", value: "sdh" },
            { label: "burn-in", value: "on" },
            { label: "export", value: ".srt / .vtt" },
          ],
        },
      },
      {
        id: "hd-no-watermark",
        title: "1080p HD, no watermarks",
        body: "Full-resolution MP4 on every plan. Your video, your file, no branding but yours.",
        linkHref: "/features",
        linkLabel: "Learn more",
        mock: {
          kind: "rows",
          heading: "render.output",
          rows: [
            { label: "container", value: "mp4" },
            { label: "resolution", value: "1080p" },
            { label: "watermark", value: "none" },
            { label: "plans", value: "all" },
          ],
        },
      },
    ],
  },
  {
    id: "scale",
    eyebrow: "04 · Scale",
    heading: "Agency-grade output.",
    pastel: "#d7e2ea",
    items: [
      {
        id: "rest-api",
        title: "REST API + webhooks",
        body: "Everything the UI does, the API does too - generate, poll, and receive webhook callbacks on every render.",
        linkHref: "/features",
        linkLabel: "Learn more",
        mock: {
          kind: "rows",
          heading: "api.reference",
          rows: [
            { label: "POST", value: "/v1/generate" },
            { label: "GET", value: "/v1/generate/:id" },
            { label: "webhook", value: "render.complete" },
            { label: "webhook", value: "render.failed" },
          ],
        },
      },
      {
        id: "batch-export",
        title: "Batch export",
        body: "Deliver multiple formats and resolutions in a single run - built for agency-scale output.",
        linkHref: "/features",
        linkLabel: "Learn more",
        mock: {
          kind: "rows",
          heading: "batch.run",
          rows: [
            { label: "9:16 · 1080p", value: "done" },
            { label: "1:1 · 1080p", value: "done" },
            { label: "16:9 · 1080p", value: "rendering", accent: true },
            { label: "9:16 · 720p", value: "queued" },
          ],
        },
      },
      {
        id: "telemetry",
        title: "Telemetry and quality gates",
        body: "Per-stage telemetry and automated quality checks on every job - a bad render never reaches your client.",
        linkHref: "/features",
        linkLabel: "Learn more",
        mock: {
          kind: "rows",
          heading: "job.telemetry",
          rows: [
            { label: "stage · script", value: "pass" },
            { label: "stage · visuals", value: "pass" },
            { label: "stage · render", value: "pass" },
            { label: "quality gate", value: "pass" },
          ],
        },
      },
    ],
  },
];

function MockPanel({ mock }: { mock: Mock }) {
  return (
    <div className="w-full max-w-[360px] rounded-lg bg-[#faf9f6] border border-[#111]/10 p-4 sm:p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#111]/45">
        {mock.heading}
      </p>
      {mock.kind === "rows" ? (
        <ul className="mt-3">
          {mock.rows.map((row, i) => (
            <li
              key={`${row.label}-${i}`}
              className={`flex items-center justify-between gap-3 py-2 ${i === 0 ? "" : "border-t border-[#111]/10"}`}
            >
              <span className="font-mono text-[11px] text-[#111]/80">
                {row.label}
              </span>
              <span
                className={`font-mono text-[11px] ${row.accent ? "text-[#ff5600]" : "text-[#111]/50"}`}
              >
                {row.value}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {mock.chips.map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-[#111]/15 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-[#111]/70"
            >
              {chip}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function FeatureGroups() {
  const [openByGroup, setOpenByGroup] = useState<Record<string, string>>({});

  return (
    <Section rule id="features">
      <Container>
        <SectionHeading
          eyebrow="Built-in features"
          title="An entire stack of tools between your idea and the upload button."
          lede="Everything a production team does - writing, sourcing, voicing, cutting, exporting - built into one render."
        />

        <div className="mt-16 space-y-24">
          {GROUPS.map((group) => {
            const openId = openByGroup[group.id] ?? group.items[0]?.id ?? "";
            const openItem =
              group.items.find((item) => item.id === openId) ?? group.items[0];
            return (
              <div key={group.id}>
                <Eyebrow>{group.eyebrow}</Eyebrow>
                <h3 className="mt-3 font-display font-normal text-[28px] sm:text-[36px] leading-[1.1] tracking-[-0.01em] text-[#111]">
                  {group.heading}
                </h3>

                <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-16 items-start">
                  <AccordionList
                    items={group.items}
                    openId={openId}
                    onOpen={(id) =>
                      setOpenByGroup((prev) => ({ ...prev, [group.id]: id }))
                    }
                  />

                  <div className="lg:sticky lg:top-24" aria-hidden>
                    <div
                      className="rounded-2xl border border-[#111]/10 aspect-[4/3] p-6 sm:p-10 flex items-center justify-center"
                      style={{ backgroundColor: group.pastel }}
                    >
                      {openItem ? (
                        <MockPanel key={openItem.id} mock={openItem.mock} />
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
