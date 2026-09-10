import { PRICING, isExcludedFeature } from "@/constants/landing";
import { PLAN_TO_PRODUCT_ID } from "@/lib/products";
import { PlanCta } from "../PlanCta";
import { ManageBillingBanner } from "../ManageBillingBanner";
import { Container, Section, SectionHeading } from "./primitives";
import { pillClasses, PILL_BASE, PILL_SIZE } from "./pill-styles";

const TRUST_ITEMS = [
  "Cancel anytime",
  "No watermarks on any plan",
  "4K MP4 export",
];

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`w-3.5 h-3.5 shrink-0 mt-[3px] ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 12.75l6 6 9-13.5"
      />
    </svg>
  );
}

export function PricingV2() {
  return (
    <Section id="pricing" rule>
      <Container>
        <SectionHeading
          eyebrow="Pricing"
          title="Pay for what you ship."
          lede="Cancel anytime. Same 60-second pipeline on every plan. No watermarks, no usage cliffs."
        />

        <ManageBillingBanner
          className="mt-10 flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-x-3 gap-y-2 font-mono text-[12.5px] text-[#111]/60"
          linkClassName="underline underline-offset-4 decoration-[#111]/30 text-[#111] hover:text-[#ff5600] transition-colors"
        />

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {PRICING.map((plan) => {
            const dark = Boolean(plan.popular);
            const productId = PLAN_TO_PRODUCT_ID[plan.planId];
            const primaryClassName = `${pillClasses(dark ? "primaryOnDark" : "primary")} w-full`;
            const secondaryClassName = `${pillClasses(dark ? "secondaryOnDark" : "secondary")} w-full`;
            const currentClassName = `${PILL_BASE} ${PILL_SIZE.md} w-full border opacity-60 cursor-default${
              dark
                ? " border-[#f4f3ec]/30 text-[#f4f3ec]"
                : " border-[#111]/25 text-[#111]"
            }`;
            return (
              <div
                key={plan.planId}
                className={`flex flex-col rounded-2xl border p-8 ${
                  dark
                    ? "border-[#f4f3ec]/15 bg-[#0b0b0b] text-[#f4f3ec]"
                    : "border-[#111]/10 bg-[#faf9f6] text-[#111]"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-sans text-[15px] font-medium">
                    {plan.name}
                  </h3>
                  {dark ? (
                    <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#ff5600]">
                      Most popular
                    </span>
                  ) : null}
                </div>

                <div className="mt-5 flex items-baseline gap-2">
                  <span className="font-display font-normal text-[56px] leading-none tracking-[-0.02em]">
                    {plan.monthlyPrice}
                  </span>
                  {plan.monthlyPrice.startsWith("$") ? (
                    <span
                      className={`font-mono text-[12px] ${dark ? "text-[#f4f3ec]/50" : "text-[#111]/50"}`}
                    >
                      /mo
                    </span>
                  ) : null}
                </div>

                <p
                  className={`mt-3 font-sans text-[14.5px] leading-[1.55] ${
                    dark ? "text-[#f4f3ec]/60" : "text-[#111]/60"
                  }`}
                >
                  {plan.description}
                </p>

                <div
                  className={`mt-7 border-t ${dark ? "border-[#f4f3ec]/15" : "border-[#111]/10"}`}
                />

                <div className="mt-6 flex-1">
                  <p
                    className={`font-mono text-[11px] uppercase tracking-[0.14em] ${
                      dark ? "text-[#f4f3ec]/50" : "text-[#111]/50"
                    }`}
                  >
                    What you get
                  </p>
                  <ul className="mt-4 space-y-3">
                    {plan.features.map((feature) => {
                      const excluded = isExcludedFeature(feature);
                      return (
                        <li
                          key={feature}
                          className={`flex items-start gap-2.5 font-sans text-[14.5px] leading-snug ${
                            excluded
                              ? dark ? "text-[#f4f3ec]/45" : "text-[#111]/45"
                              : dark ? "text-[#f4f3ec]/85" : "text-[#111]/80"
                          }`}
                        >
                          {excluded ? (
                            <span className="w-3.5 h-3.5 shrink-0 mt-[3px] text-center leading-[14px]" aria-hidden>&minus;</span>
                          ) : (
                            <CheckIcon
                              className={dark ? "text-[#f4f3ec]" : "text-[#111]"}
                            />
                          )}
                          <span>{feature}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="mt-8">
                  <PlanCta
                    planId={plan.planId}
                    productId={productId}
                    contactHref={productId ? undefined : plan.href}
                    primaryClassName={primaryClassName}
                    secondaryClassName={secondaryClassName}
                    currentClassName={currentClassName}
                    errorClassName="mt-2 font-mono text-[12px] text-[#ff5600]"
                  >
                    {plan.cta}
                  </PlanCta>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center font-mono text-[12px] text-[#111]/50">
          {TRUST_ITEMS.map((label, i) => (
            <span key={label} className="inline-flex items-center gap-x-3">
              {i > 0 ? <span aria-hidden>·</span> : null}
              {label}
            </span>
          ))}
        </p>
      </Container>
    </Section>
  );
}
