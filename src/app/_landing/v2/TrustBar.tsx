import { Container, Eyebrow, Section } from "./primitives";

const AUDIENCES = [
  "Content Creators",
  "Marketers",
  "Educators",
  "E-commerce",
  "Social Media",
  "Agencies",
] as const;

export function TrustBar() {
  return (
    <Section rule compact>
      <Container>
        <Eyebrow className="text-center text-[#111]/50">
          Built for the teams shipping video every day
        </Eyebrow>

        <div className="mt-7 flex flex-wrap items-baseline justify-center gap-x-10 gap-y-4">
          {AUDIENCES.map((name) => (
            <span
              key={name}
              className="font-display font-normal text-[24px] sm:text-[28px] text-[#111]/40 whitespace-nowrap"
            >
              {name}
            </span>
          ))}
        </div>

        <p className="mt-8 text-center font-mono text-[11px] tracking-[0.08em] text-[#111]/45">
          30-60s renders · 4K MP4 · No watermarks · Single pass
        </p>
      </Container>
    </Section>
  );
}
