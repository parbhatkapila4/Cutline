import { PRICING, isExcludedFeature } from "@/constants/landing";
import { PLAN_TO_PRODUCT_ID } from "@/lib/products";
import { PlanCta } from "../PlanCta";
import { ManageBillingBanner } from "../ManageBillingBanner";
import { Container, MonoChip, RuleHeader } from "./primitives";
import { btnClasses } from "./styles";

const TRUST_ITEMS = [
  "Cancel anytime",
  "No watermarks on any plan",
  "4K MP4 export",
];

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`mt-[3px] h-3.5 w-3.5 shrink-0 ${className}`}
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

export function PricingV3() {
  return (
    <section id="pricing" className="bg-[#f4f3f3] py-20 sm:py-28 lg:py-32">
      <Container>
        <RuleHeader
          title={<>Pay for what you ship.</>}
          lede="No watermarks, no annual lock-in. Free covers stock-image slideshows; talking-character videos start on Professional."
        />

        <ManageBillingBanner
          className="mt-12 flex flex-col flex-wrap items-start gap-x-3 gap-y-2 font-plex text-[12px] text-[#1d1c1b]/60 sm:flex-row sm:items-center"
          linkClassName="underline underline-offset-4 decoration-[#1d1c1b]/30 text-[#1d1c1b] hover:text-[#8b7ae8] transition-colors"
        />

        <div className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {PRICING.map((plan) => {
            const dark = Boolean(plan.popular);
            const productId = PLAN_TO_PRODUCT_ID[plan.planId];
            const primaryClassName = `${btnClasses(dark ? "darkSolid" : "lightSolid")} w-full`;
            const secondaryClassName = `${btnClasses(dark ? "dark" : "light")} w-full`;
            const currentClassName = `inline-flex w-full cursor-default items-center justify-center gap-2 rounded-full px-6 py-3.5 font-sans text-[15px] font-medium opacity-60 border ${
              dark
                ? "border-[#f4f3f3]/30 text-[#f4f3f3]"
                : "border-[#1d1c1b]/25 text-[#1d1c1b]"
            }`;
            return (
              <div
                key={plan.planId}
                className={`flex flex-col rounded-[32px] p-7 xl:p-8 ${
                  dark
                    ? "bg-[#1d1c1b] text-[#f4f3f3]"
                    : "border border-[#1d1c1b]/10 bg-[#fbfbfa] text-[#1d1c1b]"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-sans text-[17px] font-normal">
                    {plan.name}
                  </h3>
                  {dark ? (
                    <MonoChip
                      tone="dark"
                      className="border-[#c7e6a0]/50 text-[#c7e6a0]"
                    >
                      Most popular
                    </MonoChip>
                  ) : null}
                </div>

                <div className="mt-6 flex items-baseline gap-2">
                  <span className="font-sans text-[46px] font-normal leading-none tracking-[-0.04em] xl:text-[52px]">
                    {plan.monthlyPrice}
                  </span>
                  {plan.monthlyPrice.startsWith("$") ? (
                    <span
                      className={`font-plex text-[12px] ${dark ? "text-[#f4f3f3]/50" : "text-[#1d1c1b]/50"}`}
                    >
                      /mo
                    </span>
                  ) : null}
                </div>

                <p
                  className={`mt-4 font-sans text-[14.5px] font-medium leading-[1.5] ${
                    dark ? "text-[#f4f3f3]/65" : "text-[#1d1c1b]/65"
                  }`}
                >
                  {plan.description}
                </p>

                <div
                  className={`mt-8 border-t ${dark ? "border-[#f4f3f3]/15" : "border-[#1d1c1b]/10"}`}
                />

                <div className="mt-7 flex-1">
                  <p
                    className={`font-plex text-[10.5px] uppercase tracking-[0.07em] ${
                      dark ? "text-[#f4f3f3]/50" : "text-[#1d1c1b]/50"
                    }`}
                  >
                    What you get
                  </p>
                  <ul className="mt-5 space-y-3">
                    {plan.features.map((feature) => {
                      const excluded = isExcludedFeature(feature);
                      return (
                      <li
                        key={feature}
                        className={`flex items-start gap-2.5 font-sans text-[14.5px] font-medium leading-snug ${
                          excluded
                            ? dark ? "text-[#f4f3f3]/45" : "text-[#1d1c1b]/45"
                            : dark ? "text-[#f4f3f3]/85" : "text-[#1d1c1b]/80"
                        }`}
                      >
                        {excluded ? (
                          <span
                            className="mt-[3px] h-3.5 w-3.5 shrink-0 text-center leading-[14px]"
                            aria-hidden
                          >
                            &minus;
                          </span>
                        ) : (
                          <CheckIcon
                            className={dark ? "text-[#c7e6a0]" : "text-[#1d1c1b]"}
                          />
                        )}
                        <span>{feature}</span>
                      </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="mt-9">
                  <PlanCta
                    planId={plan.planId}
                    productId={productId}
                    contactHref={productId ? undefined : plan.href}
                    primaryClassName={primaryClassName}
                    secondaryClassName={secondaryClassName}
                    currentClassName={currentClassName}
                    errorClassName="mt-2 font-plex text-[12px] text-[#c2410c]"
                    secondaryContactHref={
                      plan.planId === "enterprise" ? plan.href : undefined
                    }
                    secondaryContactClassName={`mt-3 block text-center font-sans text-[13px] underline underline-offset-2 ${dark ? "text-[#f4f3f3]/60 hover:text-[#f4f3f3]" : "text-[#1d1c1b]/60 hover:text-[#1d1c1b]"
                      }`}
                  >
                    {plan.cta}
                  </PlanCta>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-12 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center font-plex text-[11.5px] text-[#1d1c1b]/50">
          {TRUST_ITEMS.map((label, i) => (
            <span key={label} className="inline-flex items-center gap-x-3">
              {i > 0 ? <span aria-hidden>·</span> : null}
              {label}
            </span>
          ))}
        </p>
      </Container>
    </section>
  );
}
