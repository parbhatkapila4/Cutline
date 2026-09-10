import { Container } from "./primitives";

const CAPABILITIES = [
  {
    body: "Ask for a shorter open or a different close in plain English, and the film is re-cut around the change. No timeline to scrub, no brief to write again.",
    label: "Edit by asking · Professional and up",
  },
  {
    body: "Not every video wants b-roll. The same sentence can come back as a slideshow, as a talking cartoon, or as a realistic speaker on camera, in a studio or on location.",
    label: "Four ways to shoot it",
  },
  {
    body: "Every render reports what it actually consumed, against a seconds balance you can see. No credits that vanish, no bill you find out about at the end of the month.",
    label: "Metered per render",
  },
] as const;

export function StoriesV3() {
  return (
    <section className="v3-wash pt-20 sm:pt-28 lg:pt-32">
      <Container>
        <h2 className="text-center font-sans text-[38px] font-normal tracking-[-0.03em] text-[#1d1c1b] sm:text-[48px]">
          Things the headline leaves out.
        </h2>
      </Container>

      <div className="scrollbar-hide v3-fade-top mt-16 flex snap-x snap-mandatory gap-6 overflow-x-auto px-[max(1.25rem,calc((100vw-1340px)/2))] pb-0">
        {CAPABILITIES.map((item) => (
          <figure
            key={item.label}
            className="flex w-[min(430px,84vw)] shrink-0 snap-start flex-col justify-between rounded-t-[40px] bg-[#fbfbfa]/70 px-9 pb-14 pt-14 backdrop-blur-[2px]"
          >
            <p className="font-sans text-[19px] font-normal leading-[1.4] tracking-[-0.015em] text-[#1d1c1b] sm:text-[21px]">
              {item.body}
            </p>
            <figcaption className="mt-12 font-sans text-[11.5px] font-medium uppercase tracking-[0.06em] text-[#1d1c1b]/60">
              {item.label}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
