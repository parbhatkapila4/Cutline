import type { ReactNode } from "react";
import {
  Container,
  Section,
  SectionHeading,
  TextArrowLink,
} from "./primitives";

type IconProps = { className?: string };

function IconScript({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M6 4h9l3 3v13H6z"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <path
        d="M14 4v4h4M9 12h6M9 15.5h6"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconFootage({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect
        x="3.5"
        y="6"
        width="17"
        height="12"
        rx="2.5"
        stroke="currentColor"
        strokeWidth={1.6}
      />
      <path d="M10.5 9.5l4 2.5-4 2.5z" fill="currentColor" />
    </svg>
  );
}
function IconVoice({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect
        x="9"
        y="3"
        width="6"
        height="11"
        rx="3"
        stroke="currentColor"
        strokeWidth={1.6}
      />
      <path
        d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconMusic({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M9 17.5V6l10-2v11.5"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <circle
        cx="6.5"
        cy="17.5"
        r="2.5"
        stroke="currentColor"
        strokeWidth={1.6}
      />
      <circle
        cx="16.5"
        cy="15.5"
        r="2.5"
        stroke="currentColor"
        strokeWidth={1.6}
      />
    </svg>
  );
}
function IconCaptions({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2.5"
        stroke="currentColor"
        strokeWidth={1.6}
      />
      <path
        d="M9.5 10.5a2 2 0 100 3M15.5 10.5a2 2 0 100 3"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconColor({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 3.5c4.5 3.5 6.5 6.3 6.5 9.2A6.5 6.5 0 015.5 12.7c0-2.9 2-5.7 6.5-9.2z"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconMix({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M7 4v16M17 4v16M4 9h6M14 14h6"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconRender({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 3l2 5.5 5.5 2-5.5 2L12 20l-2-5.5-5.5-2 5.5-2z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}
function GridFloor() {
  const fade =
    "radial-gradient(125% 100% at 50% 100%, #000 46%, transparent 84%)";
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <div
        className="absolute inset-0"
        style={{ perspective: "820px", perspectiveOrigin: "50% 100%" }}
      >
        <div
          className="absolute inset-x-[-40%] bottom-0 top-[40%]"
          style={{
            transform: "rotateX(56deg)",
            transformOrigin: "50% 100%",
            backgroundImage:
              "linear-gradient(rgba(17,17,17,0.20) 1px, transparent 1px)," +
              "linear-gradient(90deg, rgba(17,17,17,0.20) 1px, transparent 1px)",
            backgroundSize: "30px 30px",
            WebkitMaskImage: fade,
            maskImage: fade,
          }}
        />
      </div>
    </div>
  );
}
function Lockup({
  icon,
  label,
  color,
}: {
  icon: ReactNode;
  label: string;
  color: string;
}) {
  return (
    <div className="inline-flex items-center gap-2.5">
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px]"
        style={{ backgroundColor: `${color}17`, color }}
      >
        {icon}
      </span>
      <span className="font-sans text-[14.5px] font-semibold tracking-[-0.02em] text-[#111]">
        {label}
      </span>
    </div>
  );
}

function Marker({
  icon,
  color,
  className = "",
}: {
  icon: ReactNode;
  color: string;
  className?: string;
}) {
  return (
    <span className={`absolute ${className}`} aria-hidden>
      <span className="absolute -bottom-[6px] left-1/2 h-[8px] w-[150%] -translate-x-1/2 rounded-[50%] bg-[#111]/25 blur-[5px]" />
      <span
        className="relative grid h-full w-full place-items-center rounded-[12px] border border-[#111]/10 bg-white shadow-[0_14px_22px_-13px_rgba(17,17,17,0.5)]"
        style={{ color }}
      >
        {icon}
      </span>
    </span>
  );
}

function StackIllustration() {
  return (
    <div className="relative h-[250px] overflow-hidden">
      <GridFloor />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 54% at 50% 2%, rgba(255,255,255,0.9), transparent 70%)",
        }}
        aria-hidden
      />
      <div className="absolute inset-x-0 top-0 flex justify-center pt-7">
        <div className="grid grid-cols-2 gap-x-9 gap-y-4">
          <Lockup
            icon={<IconScript className="h-[18px] w-[18px]" />}
            label="Script"
            color="#334155"
          />
          <Lockup
            icon={<IconFootage className="h-[18px] w-[18px]" />}
            label="Footage"
            color="#ff5600"
          />
          <Lockup
            icon={<IconVoice className="h-[18px] w-[18px]" />}
            label="Voice"
            color="#7c3aed"
          />
          <Lockup
            icon={<IconMusic className="h-[18px] w-[18px]" />}
            label="Music"
            color="#16a34a"
          />
        </div>
      </div>
      <Marker
        icon={<IconMix className="h-4 w-4" />}
        color="#0ea5a3"
        className="h-8 w-8 left-[40%] top-[54%]"
      />
      <Marker
        icon={<IconCaptions className="h-[18px] w-[18px]" />}
        color="#2563eb"
        className="h-9 w-9 left-[61%] top-[58%]"
      />
      <Marker
        icon={<IconColor className="h-5 w-5" />}
        color="#d97706"
        className="h-10 w-10 left-[27%] top-[63%]"
      />
      <div className="absolute left-[47%] top-[70%] h-11 w-11" aria-hidden>
        <span className="absolute -bottom-[6px] left-1/2 h-[8px] w-[150%] -translate-x-1/2 rounded-[50%] bg-[#111]/25 blur-[5px]" />
        <span className="absolute -inset-[9px] rounded-[16px] border border-dashed border-[#ff5600]/70" />
        <span className="absolute -left-[12px] -top-[12px] h-[7px] w-[7px] rounded-[2px] border border-[#ff5600] bg-white" />
        <span className="absolute -right-[12px] -top-[12px] h-[7px] w-[7px] rounded-[2px] border border-[#ff5600] bg-white" />
        <span className="absolute -bottom-[12px] -left-[12px] h-[7px] w-[7px] rounded-[2px] border border-[#ff5600] bg-white" />
        <span className="absolute -bottom-[12px] -right-[12px] h-[7px] w-[7px] rounded-[2px] border border-[#ff5600] bg-white" />
        <span className="relative grid h-full w-full place-items-center rounded-[12px] border border-[#111]/10 bg-white text-[#111] shadow-[0_14px_22px_-13px_rgba(17,17,17,0.5)]">
          <IconRender className="h-6 w-6" />
        </span>
      </div>
    </div>
  );
}

function CardShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-[20px] border border-[#111]/10 bg-[#faf9f6] ${className}`}
    >
      {children}
    </div>
  );
}

function FeatureCard({
  illustration,
  heading,
  body,
  link,
}: {
  illustration: ReactNode;
  heading: string;
  body: string;
  link?: { href: string; label: string };
}) {
  return (
    <CardShell>
      <div className="relative">{illustration}</div>
      <div className="flex flex-1 flex-col px-6 pb-6 pt-1 sm:px-7 sm:pb-7">
        <h3 className="font-sans text-[19px] font-semibold tracking-[-0.02em] text-[#111]">
          {heading}
        </h3>
        <p className="mt-2.5 font-sans text-[14.5px] leading-[1.55] text-[#111]/65">
          {body}
        </p>
        {link ? (
          <TextArrowLink href={link.href} className="mt-4">
            {link.label}
          </TextArrowLink>
        ) : null}
      </div>
    </CardShell>
  );
}

function PlaceholderCard({ index }: { index: number }) {
  const label = String(index).padStart(2, "0");
  return (
    <CardShell className="border-dashed">
      <div className="relative h-[240px] border-b border-dashed border-[#111]/10">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(17,17,17,0.05) 1px, transparent 1px)," +
              "linear-gradient(90deg, rgba(17,17,17,0.05) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
          aria-hidden
        />
        <span className="absolute left-6 top-5 font-mono text-[12px] tracking-[0.14em] text-[#111]/35">
          {label}
        </span>
        <span className="absolute inset-0 grid place-items-center font-mono text-[12px] uppercase tracking-[0.16em] text-[#111]/30">
          Card {index}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-6 sm:p-7">
        <span
          className="h-[15px] w-2/3 rounded-full bg-[#111]/[0.07]"
          aria-hidden
        />
        <span
          className="h-[11px] w-full rounded-full bg-[#111]/[0.05]"
          aria-hidden
        />
        <span
          className="h-[11px] w-4/5 rounded-full bg-[#111]/[0.05]"
          aria-hidden
        />
      </div>
    </CardShell>
  );
}

export function HowItWorks() {
  return (
    <Section rule id="how-it-works">
      <Container>
        <SectionHeading
          eyebrow="How it works"
          title={
            <>
              Instant everything,{" "}
              <span className="text-[#111]/45">the whole stack.</span>
            </>
          }
          lede="Every model, source, and render step Cutline needs is wired in from the first prompt - swappable the moment you want your own."
        />

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            illustration={<StackIllustration />}
            heading="Built on the whole stack"
            body="Cutline runs the best model at every stage - scripting, footage, voice, music, and render - behind a single prompt. Swap any piece, or bring your own."
            link={{ href: "/how", label: "Learn more" }}
          />
          {[2, 3, 4, 5, 6].map((n) => (
            <PlaceholderCard key={n} index={n} />
          ))}
        </div>
      </Container>
    </Section>
  );
}
