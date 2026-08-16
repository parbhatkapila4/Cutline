import type { ReactNode } from "react";
import {
  Container,
  Section,
  SectionHeading,
  TextArrowLink,
} from "./primitives";

function SubSection({
  heading,
  body,
  link,
  media,
  mediaFirst = false,
}: {
  heading: string;
  body: string;
  link?: { href: string; label: string };
  media: ReactNode;
  mediaFirst?: boolean;
}) {
  return (
    <div className="grid lg:grid-cols-2 gap-10 items-center">
      <div className="max-w-[520px]">
        <h3 className="font-display font-normal text-[28px] sm:text-[36px] leading-[1.1] tracking-[-0.01em] text-[#111]">
          {heading}
        </h3>
        <p className="mt-4 font-sans text-[17px] leading-[1.5] text-[#111]/70">
          {body}
        </p>
        {link ? (
          <TextArrowLink href={link.href} className="mt-5">
            {link.label}
          </TextArrowLink>
        ) : null}
      </div>
      <div className={mediaFirst ? "lg:order-first" : ""}>{media}</div>
    </div>
  );
}

function MediaCard({ bg, children }: { bg: string; children: ReactNode }) {
  return (
    <div
      className="rounded-2xl aspect-[4/3] border border-[#111]/10 flex items-center justify-center p-6 sm:p-10"
      style={{ backgroundColor: bg }}
    >
      {children}
    </div>
  );
}

const PIPELINE_ROWS = [
  { num: "01", label: "Intent", state: "done" },
  { num: "02", label: "Narrative", state: "done" },
  { num: "03", label: "Visualize", state: "done" },
  { num: "04", label: "Render", state: "active" },
] as const;

function PipelineMock() {
  return (
    <div className="w-full max-w-[360px] rounded-lg bg-[#faf9f6] border border-[#111]/10 p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#111]/45">
        Pipeline
      </p>
      <ul className="mt-3">
        {PIPELINE_ROWS.map((row) => (
          <li
            key={row.num}
            className="flex items-center justify-between gap-3 py-2.5 border-b border-[#111]/10 last:border-b-0"
          >
            <span className="font-mono text-[12px] text-[#111]">
              <span className="text-[#111]/40 mr-2">{row.num}</span>
              {row.label}
            </span>
            <span
              aria-hidden
              className={`w-2 h-2 rounded-full shrink-0 ${
                row.state === "active" ? "bg-[#ff5600]" : "bg-[#111]"
              }`}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

const TELEMETRY_ROWS = [
  { label: "script", value: "pass", accent: false },
  { label: "visuals", value: "pass", accent: false },
  { label: "render", value: "68%", accent: true },
] as const;

function TelemetryMock() {
  return (
    <div className="w-full max-w-[360px] rounded-lg bg-[#faf9f6] border border-[#111]/10 p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#111]/45">
        Telemetry
      </p>
      <ul className="mt-3 space-y-3">
        {TELEMETRY_ROWS.map((row) => (
          <li
            key={row.label}
            className="flex items-baseline gap-2 font-mono text-[12px] text-[#111]"
          >
            <span>{row.label}</span>
            <span
              aria-hidden
              className="flex-1 border-b border-dotted border-[#111]/30 mb-[3px]"
            />
            <span className={row.accent ? "text-[#ff5600]" : ""}>
              {row.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const COMPARISON_ROWS = [
  { label: "Total time", old: "4 days", cutline: "60 seconds" },
  { label: "Headcount", old: "5 people", cutline: "1 prompt" },
  { label: "Cost per video", old: "$3,400+", cutline: "$0.24" },
] as const;

function ComparisonMock() {
  return (
    <div className="w-full max-w-[380px] rounded-lg bg-[#faf9f6] border border-[#111]/10 p-5">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[#111]/10">
            <td aria-hidden className="py-2" />
            <th
              scope="col"
              className="py-2 pr-3 text-left font-mono font-normal text-[11px] uppercase tracking-[0.1em] text-[#111]/45"
            >
              The old way
            </th>
            <th
              scope="col"
              className="py-2 text-left font-mono font-normal text-[11px] uppercase tracking-[0.1em] text-[#111]"
            >
              With Cutline
            </th>
          </tr>
        </thead>
        <tbody>
          {COMPARISON_ROWS.map((row) => (
            <tr key={row.label} className="border-b border-[#111]/10">
              <th
                scope="row"
                className="py-2.5 pr-3 text-left font-sans font-normal text-[12px] text-[#111]/55"
              >
                {row.label}
              </th>
              <td className="py-2.5 pr-3 font-mono text-[12px] text-[#111]/45 line-through decoration-[#111]/30">
                {row.old}
              </td>
              <td className="py-2.5 font-mono text-[12px] text-[#111]">
                {row.cutline}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 font-mono text-[11px] text-[#ff5600]">
        5,760&times; faster &middot; 14,000&times; cheaper
      </p>
    </div>
  );
}

export function Solution() {
  return (
    <Section rule id="how-it-works">
      <Container>
        <SectionHeading
          eyebrow="How it works"
          title="From one sentence to a finished video."
          lede="One sentence in. A directed, captioned, music-cut MP4 out - every shot sourced, scripted, and rendered in a single pass."
        />
        <div className="mt-16 space-y-20">
          <SubSection
            heading="An AI director, not a template."
            body="Cutline plans your video the way a director would: intent, narrative, shots, visuals, motion, voice, subtitles, and score - twelve stages, zero templates."
            link={{ href: "/how", label: "See the pipeline" }}
            media={
              <MediaCard bg="#d9e2d4">
                <PipelineMock />
              </MediaCard>
            }
          />
          <SubSection
            heading="Every second accounted for."
            body="Watch each stage report in as it runs - live queue position, per-stage telemetry, and quality gates that catch a bad render before you ever see it."
            link={{ href: "/status", label: "Check system status" }}
            mediaFirst
            media={
              <MediaCard bg="#d7e2ea">
                <TelemetryMock />
              </MediaCard>
            }
          />
          <SubSection
            heading="The old way, retired."
            body="A single brief used to route through five tools and five people. Cutline collapses the whole pipeline into one prompt."
            media={
              <MediaCard bg="#f0dcc8">
                <ComparisonMock />
              </MediaCard>
            }
          />
        </div>
      </Container>
    </Section>
  );
}
