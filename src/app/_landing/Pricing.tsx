import { PRICING } from "@/constants/landing";

export function Pricing() {
  return (
    <section
      id="pricing"
      className="pt-44 pb-44 px-4 sm:px-6 xl:px-10 2xl:px-14 relative overflow-hidden font-sans"
    >
      <div className="max-w-[min(1680px,96vw)] mx-auto">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gray-200 bg-white/80 backdrop-blur-sm text-[10.5px] font-semibold tracking-[0.18em] text-gray-600 uppercase shadow-[0_1px_2px_rgba(15,23,42,0.04)] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Pricing
          </div>
          <h2 className="text-[2.25rem] sm:text-[2.75rem] md:text-[3.25rem] font-bold leading-[1.04] tracking-[-0.03em] text-[#0a0a0a] max-w-[20ch] mx-auto">
            Pay for what you ship.
          </h2>
          <p className="text-[15px] text-[#52525b] max-w-[46ch] mx-auto mt-5 leading-relaxed">
            Cancel anytime. Same 60-second pipeline on every plan. No watermarks, no usage cliffs.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 max-w-[1180px] mx-auto">
          {PRICING.map((plan) => {
            const isPopular = plan.popular;
            return (
              <div
                key={plan.name}
                className={
                  isPopular
                    ? "relative rounded-2xl bg-[#0a0a0a] text-white p-7 flex flex-col shadow-[0_24px_48px_-24px_rgba(15,23,42,0.45)] ring-1 ring-white/10 -mt-3 md:-mt-5"
                    : "relative rounded-2xl bg-white border border-gray-200 p-7 flex flex-col"
                }
              >
                {isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold tracking-[0.16em] uppercase shadow-[0_4px_12px_-4px_rgba(16,185,129,0.5)]">
                    <span className="w-1 h-1 rounded-full bg-white" />
                    Most popular
                  </span>
                )}

                <div className="mb-1">
                  <h3 className={`text-[15px] font-semibold tracking-[-0.005em] ${isPopular ? "text-white" : "text-[#0a0a0a]"}`}>
                    {plan.name}
                  </h3>
                </div>
                <p className={`text-[13px] leading-relaxed mb-7 min-h-[42px] ${isPopular ? "text-white/60" : "text-[#52525b]"}`}>
                  {plan.description}
                </p>

                <div className="flex items-baseline gap-1 mb-7">
                  <span className={`text-[2.75rem] font-bold tracking-[-0.04em] tabular-nums ${isPopular ? "text-white" : "text-[#0a0a0a]"}`}>
                    {plan.monthlyPrice}
                  </span>
                  <span className={`text-[13px] font-medium ${isPopular ? "text-white/50" : "text-[#71717a]"}`}>
                    /mo
                  </span>
                </div>

                <a
                  href={plan.href}
                  className={
                    isPopular
                      ? "inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white hover:bg-gray-100 text-[#0a0a0a] text-[13px] font-bold tracking-[0.06em] uppercase transition-colors mb-7"
                      : "inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-300 hover:border-gray-400 bg-white text-[#0a0a0a] text-[13px] font-bold tracking-[0.06em] uppercase transition-colors mb-7"
                  }
                >
                  {plan.cta}
                  <svg className="w-3.5 h-3.5 -mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </a>

                <div className={`pt-6 border-t ${isPopular ? "border-white/10" : "border-gray-100"}`}>
                  <p className={`text-[10.5px] font-semibold tracking-[0.16em] uppercase mb-4 ${isPopular ? "text-white/60" : "text-[#71717a]"}`}>
                    What you get
                  </p>
                  <ul className="space-y-3">
                    {plan.features.map((feature, fi) => (
                      <li key={fi} className={`flex items-start gap-2.5 text-[13px] leading-snug ${isPopular ? "text-white/85" : "text-[#3f3f46]"}`}>
                        <svg
                          className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isPopular ? "text-emerald-400" : "text-emerald-600"}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth={2.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-[12px] text-[#71717a]">
          {[
            "Cancel anytime",
            "No watermarks on any plan",
            "Same 1080p HD output across all tiers",
          ].map((label) => (
            <span key={label} className="inline-flex items-center gap-1.5 leading-none">
              <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <span className="leading-none">{label}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
