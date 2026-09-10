import { LoadingLink } from "@/components/ui/loading-link";
import { CutlineLogo } from "@/components/brand/CutlineLogo";
import { PRICING } from "@/constants/landing";
import { PLAN_TO_PRODUCT_ID, TOPUP_PRODUCT_ID, TOPUP_SECONDS, TOPUP_PRICE_USD } from "@/lib/products";
import { PlanCta } from "@/app/_landing/PlanCta";
import { ManageBillingBanner } from "@/app/_landing/ManageBillingBanner";
import { TopupCta } from "@/app/_landing/TopupCta";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 py-4 flex justify-start bg-black/60 backdrop-blur-sm border-b border-white/5">
        <LoadingLink
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-white border border-white/20 hover:bg-white/5 px-3 py-2 rounded-lg transition-colors"
        >
          <CutlineLogo size="sm" className="max-w-[140px]" />
          <span>Home</span>
        </LoadingLink>
      </div>

      <main className="pt-24 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[min(90vw,1760px)] mx-auto">
          <section className="mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4">Pricing</h1>
            <p className="text-xl text-zinc-400 leading-relaxed max-w-3xl">
              Straight answer: we charge because every generated video creates real backend cost - model calls, rendering
              compute, and storage/bandwidth.
            </p>
            <p className="mt-3 text-sm text-zinc-500 max-w-3xl">
              No fake urgency, no fake discounts. Pick the tier that matches your monthly usage.
            </p>
          </section>

          <section className="mb-12 rounded-2xl border border-white/10 bg-white/2 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold text-white mb-3">How billing works</h2>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li>- Plans are monthly subscriptions billed securely via Dodo Payments. Cancel anytime.</li>
        
              <li>- Video counts and talking-character seconds are enforced monthly, per tier. Both reset on the 1st.</li>
              <li>- The free plan covers stock-image slideshows up to 20 seconds. AI-generated imagery starts on Beginner.</li>
              <li>- Talking-character videos - cartoon, cinematic and avatar - are Professional and Enterprise only.</li>
              <li>- Enterprise is custom (REST API, unlimited calls) - talk to us for volume pricing.</li>
            </ul>
          </section>

          <ManageBillingBanner
            className="mb-8 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/2 px-6 py-4 text-sm text-zinc-400"
            linkClassName="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-zinc-200 transition-colors shrink-0"
          />

       
          <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {PRICING.map((plan) => {
              const productId = PLAN_TO_PRODUCT_ID[plan.planId];
              const highlighted = plan.highlighted;
              const ctaClass = highlighted
                ? "mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed bg-white text-black hover:bg-zinc-200"
                : "mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed border border-white/20 text-white hover:bg-white/5";
              const secondaryClass = "mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors border border-white/20 text-white hover:bg-white/5";
              const currentClass = "mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 cursor-default";
              return (
                <article
                  key={plan.planId}
                  className={`rounded-2xl border p-6 flex flex-col ${highlighted ? "border-amber-400/50 bg-amber-500/5" : "border-white/10 bg-zinc-950"
                    }`}
                >
                  <div className="mb-4">
                    {highlighted && (
                      <span className="inline-flex rounded-full border border-amber-300/50 bg-amber-300/10 px-2.5 py-1 text-[11px] font-medium text-amber-200 mb-3">
                        Most used
                      </span>
                    )}
                    <h3 className="text-xl font-semibold">{plan.name}</h3>
                    <div className="mt-3 flex items-end gap-2">
                      <span className="text-4xl font-bold">{plan.monthlyPrice}</span>
                      {plan.monthlyPrice.startsWith("$") ? (
                        <span className="text-sm text-zinc-500 pb-1">/mo</span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-zinc-400">{plan.description}</p>
                  </div>

                  <ul className="space-y-2 text-sm text-zinc-300 flex-1">
                    {plan.features.map((feature, fi) => (
                      <li key={fi}>{feature}</li>
                    ))}
                  </ul>

                  <PlanCta
                    planId={plan.planId}
                    productId={productId}
                    contactHref={productId ? undefined : plan.href}
                    primaryClassName={ctaClass}
                    secondaryClassName={secondaryClass}
                    currentClassName={currentClass}
                    errorClassName="mt-2 text-[12px] text-red-400"
                    secondaryContactHref={
                      plan.planId === "enterprise" ? plan.href : undefined
                    }
                    secondaryContactClassName="mt-3 block text-center text-[13px] text-zinc-400 underline underline-offset-2 hover:text-zinc-200"
                  >
                    {plan.cta}
                  </PlanCta>
                </article>
              );
            })}
          </section>

          <section id="topup" className="mt-10 scroll-mt-24">
            <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6 sm:flex sm:items-center sm:justify-between sm:gap-8">
              <div>
                <h2 className="text-xl font-semibold">Need more talking-character seconds?</h2>
                <p className="mt-2 text-sm text-zinc-400 max-w-[60ch]">
                  Professional includes 90 seconds a month. Add {TOPUP_SECONDS} more for
                  {" "}${TOPUP_PRICE_USD}, once. Purchased seconds never expire, and your
                  monthly allowance is always spent first so nothing you paid for is lost
                  at the end of the month.
                </p>
              </div>
              <div className="mt-5 sm:mt-0 sm:shrink-0">
                <TopupCta
                  productId={TOPUP_PRODUCT_ID}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
                  errorClassName="mt-2 text-[12px] text-red-400"
                />
              </div>
            </div>
          </section>

          <section className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6">
              <h2 className="text-xl font-semibold mb-3">Why pricing exists</h2>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li>- Model calls cost money per request (prompt analysis, scripting, visuals, voice generation).</li>
                <li>- Video rendering is compute-heavy and runs in worker queues.</li>
                <li>- Generated assets and video delivery require storage + bandwidth.</li>
                <li>- Reliability costs include infra, monitoring, and retries when providers fail.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6">
              <h2 className="text-xl font-semibold mb-3">What you are paying for</h2>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li>- Higher monthly limits so you can generate more without being blocked.</li>
                <li>- More backend budget allocated to your account (especially compute-heavy flows).</li>
                <li>- Predictable access to the generation pipeline at your usage level.</li>
              </ul>
              <p className="mt-5 text-sm text-zinc-400">
                Need help choosing? Email{" "}
                <a href="mailto:parbhat@parbhat.work" className="underline hover:text-zinc-200">
                  parbhat@parbhat.work
                </a>
                .
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
