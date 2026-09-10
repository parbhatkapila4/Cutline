import { Container, Section, TestimonialFigure } from "./primitives";

export function TestimonialOne() {
  return (
    <Section rule>
      <Container>
        <TestimonialFigure
          quote="From idea to 4K download in one flow. We needed something that felt professional without a full production team. Cutline does exactly that."
          name="Omar Raza"
          role="Founder"
        />
      </Container>
    </Section>
  );
}

export function TestimonialTwo() {
  return (
    <Section rule>
      <Container>
        <TestimonialFigure
          quote="Our campaigns needed more video and we didn’t have the bandwidth. Cutline lets us go from brief to asset in minutes. No watermarks, no lock-in."
          name="Farhan Siddiqui"
          role="Marketing Director"
        />
      </Container>
    </Section>
  );
}

export function TestimonialThree() {
  return (
    <Section rule>
      <Container>
        <TestimonialFigure
          quote="We use it for sales demos and onboarding. One pipeline, same high bar every time. Clients think we have a full video team. We don’t, we have Cutline."
          name="Sana Sheikh"
          role="Sales Lead"
        />
      </Container>
    </Section>
  );
}
