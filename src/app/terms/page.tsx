import Link from "next/link";
import { CutlineLogo } from "@/components/brand/CutlineLogo";

const SECTIONS = [
  { id: "summary", label: "Summary" },
  { id: "service", label: "The service" },
  { id: "eligibility", label: "Eligibility" },
  { id: "account", label: "Your account" },
  { id: "acceptable-use", label: "Acceptable use" },
  { id: "your-content", label: "Your content" },
  { id: "ai-output", label: "AI-generated output" },
  { id: "third-party", label: "Third-party services" },
  { id: "billing", label: "Plans, billing, refunds" },
  { id: "termination", label: "Termination" },
  { id: "disclaimer", label: "No warranty" },
  { id: "liability", label: "Limitation of liability" },
  { id: "indemnity", label: "Indemnification" },
  { id: "governing-law", label: "Governing law" },
  { id: "changes", label: "Changes" },
  { id: "contact", label: "Contact" },
];

const EFFECTIVE_DATE = "10 May 2026";
const CONTACT_EMAIL = "parbhat@parbhat.work";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 py-4 flex justify-start bg-black/60 backdrop-blur-sm border-b border-white/5">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-white border border-white/20 hover:bg-white/5 px-3 py-2 rounded-lg transition-colors"
        >
          <CutlineLogo size="sm" className="max-w-[140px]" />
          <span>Home</span>
        </Link>
      </div>

      <main className="pt-24 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[min(90vw,1760px)] mx-auto grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-10 lg:gap-14">

          <aside className="lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto" aria-label="Page sections">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <h2 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.16em] mb-3.5">On this page</h2>
              <ul className="space-y-1.5 text-[13.5px]">
                {SECTIONS.map(({ id, label }) => (
                  <li key={id}>
                    <a href={`#${id}`} className="block text-zinc-400 hover:text-white transition-colors leading-snug">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <div className="min-w-0">

            <section className="mb-12">
              <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-[0.18em] mb-3">Terms of service</p>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4">
                Cutline terms of service
              </h1>
              <p className="text-zinc-400 text-sm">Effective: {EFFECTIVE_DATE}</p>
            </section>

            {/*
              LEGAL REVIEW (terms of service): this document was drafted to mirror the
              actual operations of the Cutline service as implemented in this codebase.
              Before launch, qualified counsel should:
                - confirm the named operating entity (Delaware C-Corp, LLC, etc.) and registration details,
                - validate the liability cap against unwaivable consumer-protection rules in target markets (EU, UK, California, Quebec, Australia),
                - validate the indemnification clause and consider mutual indemnity for B2B customers,
                - validate the refund clause against statutory withdrawal rights (EU/UK 14-day cooling-off, California auto-renewal disclosures),
                - confirm whether a separate enterprise / commercial agreement is needed for B2B contracts,
                - decide whether to add a binding-arbitration / class-action waiver clause for US consumers,
                - confirm that the AI-output and acceptable-use clauses cover regulatory regimes you ship under (EU AI Act, US state deepfake laws, etc.).
            */}

            <section id="summary" className="mb-16">
              <h2 className="text-2xl font-semibold text-white mb-4">Summary</h2>
              <ul className="space-y-2 text-zinc-400 text-sm leading-relaxed list-disc pl-5">
                <li>Cutline is an AI service that turns one sentence into a short MP4 video.</li>
                <li>You own your inputs (prompts, uploaded assets) and the videos we generate for you, subject to the third-party content rules below.</li>
                <li>AI-generated output may be wrong. Review it before publishing.</li>
                <li>Don&apos;t use Cutline for illegal, abusive, or rights-infringing content. We will terminate accounts that do.</li>
                <li>Paid plans renew automatically until you cancel. Refund eligibility is described below.</li>
                <li>The service is provided &quot;as is&quot; with no warranties beyond those required by law. Our liability is capped.</li>
              </ul>
            </section>

            <section id="service" className="mb-16">
              <h2 className="text-2xl font-semibold text-white mb-4">The service</h2>
              <p className="text-zinc-400 text-sm leading-relaxed">Cutline (&quot;we&quot;, &quot;us&quot;), available at <span className="text-zinc-200">cutline.cloud</span>, operates an automated video-generation pipeline. You submit a sentence (and optional configuration); we run a sequence of AI stages (intent, narrative, shots, script, voice, image sourcing, motion, render) and return a 30 to 60 second MP4. Some stages call third-party AI providers (see our <Link href="/privacy" className="underline hover:text-white">Privacy Policy</Link> for the full list). The service is delivered over the internet from servers we operate or rent.</p>
            </section>

            <section id="eligibility" className="mb-16">
              <h2 className="text-2xl font-semibold text-white mb-4">Eligibility</h2>
              <p className="text-zinc-400 text-sm leading-relaxed">You may use Cutline if you are at least 16 years old (or the higher minimum age that applies in your country) and you can form a binding contract under the laws of the State of Delaware, United States. By using the service you confirm you meet these requirements. If you are using Cutline on behalf of an organisation, you represent that you have authority to bind that organisation to these terms; in that case &quot;you&quot; means both you and the organisation.</p>
            </section>

            <section id="account" className="mb-16">
              <h2 className="text-2xl font-semibold text-white mb-4">Your account</h2>
              <ul className="space-y-2 text-zinc-400 text-sm leading-relaxed list-disc pl-5">
                <li>You are responsible for keeping your sign-in credentials confidential and for any activity under your account.</li>
                <li>You must give us accurate information when registering and keep it up to date.</li>
                <li>One account per person or organisation. Don&apos;t share or sublicense your account.</li>
                <li>If you believe your account has been compromised, contact {CONTACT_EMAIL} immediately.</li>
              </ul>
            </section>

            {/* LEGAL REVIEW (acceptable use): the prohibitions below should be cross-checked against local content laws (deepfake statutes, election-period speech rules, EU AI Act content-labelling) in target markets. Consider adding a content-takedown / DMCA agent contact if you start receiving notices. */}
            <section id="acceptable-use" className="mb-16">
              <h2 className="text-2xl font-semibold text-white mb-4">Acceptable use</h2>
              <p className="text-zinc-400 text-sm leading-relaxed mb-4">You agree not to use Cutline (and not to permit anyone else to use Cutline) to create, request, or distribute content that:</p>
              <ul className="space-y-2 text-zinc-400 text-sm leading-relaxed list-disc pl-5">
                <li>Violates any applicable law or regulation.</li>
                <li>Infringes intellectual property, publicity, privacy, or other rights of any person.</li>
                <li>Is sexual content involving minors, or sexually explicit content of identifiable real people without their documented consent.</li>
                <li>Promotes terrorism, mass violence, self-harm, or facilitates the planning or commission of violent crime.</li>
                <li>Targets, harasses, or defames a specific person or group on the basis of protected characteristics.</li>
                <li>Impersonates real people or organisations in a way that is misleading or harmful (including political deepfakes designed to deceive viewers).</li>
                <li>Generates malware, phishing material, or content designed to defraud.</li>
                <li>Attempts to reverse engineer the service, extract our prompts, train competing models on our outputs, or scrape the service at scale.</li>
                <li>Bypasses our rate limits, free-tier limits, or content filters.</li>
                <li>Uploads malware, viruses, or files designed to disrupt the service or other users.</li>
              </ul>
              <p className="text-zinc-400 text-sm leading-relaxed mt-4">We may remove content, suspend, or terminate accounts that violate these rules, with or without notice. Where the conduct may be unlawful, we may report it to the relevant authorities.</p>
            </section>

            <section id="your-content" className="mb-16">
              <h2 className="text-2xl font-semibold text-white mb-4">Your content</h2>
              <div className="space-y-4 text-zinc-400 text-sm leading-relaxed">
                <p><span className="text-zinc-300 font-medium">Ownership.</span> You retain all rights to the prompts you submit and to any assets (images, logos, brand colours, reference media) you upload to Cutline. Nothing in these terms transfers ownership of your inputs to us.</p>
                <p><span className="text-zinc-300 font-medium">Licence to operate.</span> To run the service you grant us a worldwide, non-exclusive, royalty-free licence to host, store, transmit, process, and display your inputs, only as necessary to operate the pipeline (including transmitting them to the third-party AI providers listed in our Privacy Policy) and to provide your account history. This licence ends when you delete the inputs or close your account, except for backups required by our retention schedule.</p>
                <p><span className="text-zinc-300 font-medium">Your warranties.</span> By submitting content to Cutline you warrant that you own it or have all necessary rights and permissions, that it does not infringe any third party&apos;s rights, and that processing it through Cutline does not violate any law.</p>
                <p><span className="text-zinc-300 font-medium">No model training.</span> We do not use your inputs or generated outputs to train our own models or improve our service. Whether the third-party AI providers do is governed by their own terms.</p>
              </div>
            </section>

            {/* LEGAL REVIEW (AI output): EU AI Act Article 50 requires certain AI-generated or AI-manipulated content to be marked as such where it could mislead viewers. US state laws (e.g. California AB 2655, Texas SB 751) impose deepfake disclosures around elections and identifiable people. Confirm whether output watermarking / C2PA provenance metadata is required for your target markets. */}
            <section id="ai-output" className="mb-16">
              <h2 className="text-2xl font-semibold text-white mb-4">AI-generated output</h2>
              <div className="space-y-4 text-zinc-400 text-sm leading-relaxed">
                <p><span className="text-zinc-300 font-medium">You own the videos.</span> Subject to your compliance with these terms, we assign to you whatever ownership rights we may have in the final MP4 we generate for your account. You can use it for any lawful purpose, including commercial use, without further permission from us.</p>
                <p><span className="text-zinc-300 font-medium">Caveat: stock and AI image rights.</span> The visuals inside your video may be sourced from stock-photo APIs (Unsplash, Pexels) or generated by third-party models (DALL·E, Google Veo). Stock photos remain subject to the licence of the platform they came from. AI-generated frames are subject to the third-party provider&apos;s output policy. We pass through whatever rights those providers grant; we cannot grant more.</p>
                <p><span className="text-zinc-300 font-medium">No accuracy guarantee.</span> AI output is statistical and can be factually wrong, biased, or misleading. We make no guarantee that the script, voiceover, or imagery is accurate, current, suitable for a particular purpose, or free of unintended associations. You are responsible for reviewing every video before you publish it.</p>
                <p><span className="text-zinc-300 font-medium">Similarity is possible.</span> Different users with similar prompts may receive similar outputs. We make no warranty that your video is unique.</p>
                <p><span className="text-zinc-300 font-medium">No likeness.</span> Don&apos;t prompt for, and don&apos;t use Cutline to generate, video that depicts a specific real person without their documented consent.</p>
              </div>
            </section>

            <section id="third-party" className="mb-16">
              <h2 className="text-2xl font-semibold text-white mb-4">Third-party services</h2>
              <p className="text-zinc-400 text-sm leading-relaxed">Cutline relies on third-party APIs (LLM providers, TTS providers, image-search providers, payment processors, hosting). Their availability and terms are outside our control. If a sub-processor changes its terms, has an outage, or refuses a request (for example, content filtering by an upstream LLM), the Cutline service may be affected. We are not liable for downtime or failures caused by third-party services beyond what is required by law.</p>
            </section>

            {/* LEGAL REVIEW (billing / refunds): California Auto-Renewal Law (Bus. & Prof. Code §17600) requires specific in-checkout disclosures and an easy online-cancellation method; verify the checkout flow complies. EU/UK consumers have a 14-day statutory withdrawal right under the Consumer Rights Directive that may override the no-refund default for non-business buyers. Confirm refund handling with DODO Payments and Stripe contractually. */}
            <section id="billing" className="mb-16">
              <h2 className="text-2xl font-semibold text-white mb-4">Plans, billing, refunds</h2>
              <div className="space-y-4 text-zinc-400 text-sm leading-relaxed">
                <p><span className="text-zinc-300 font-medium">Free tier.</span> We offer a limited free plan. Free generations may be subject to additional rate limits, watermark policies, or usage caps; we may change those at any time on prospective notice.</p>
                <p><span className="text-zinc-300 font-medium">Paid plans.</span> If you subscribe, you authorise our payment processors (DODO Payments, Stripe) to charge your selected payment method on a recurring basis at the price displayed at checkout, until you cancel.</p>
                <p><span className="text-zinc-300 font-medium">Cancellation.</span> You can cancel at any time from your dashboard or by writing to {CONTACT_EMAIL}. Cancellation takes effect at the end of the current billing period; you continue to have access until then.</p>
                <p><span className="text-zinc-300 font-medium">Refunds.</span> Except where required by law (for example, statutory withdrawal rights in the EU/UK), payments are non-refundable. We may, at our discretion, issue prorated refunds for unused time or service outages we determine were our fault. Contact {CONTACT_EMAIL} within 14 days of the charge to request consideration.</p>
                <p><span className="text-zinc-300 font-medium">Taxes.</span> Prices displayed are exclusive of taxes unless stated otherwise. You are responsible for any applicable VAT, GST, sales, or similar taxes in your jurisdiction.</p>
                <p><span className="text-zinc-300 font-medium">Price changes.</span> We may change prices on prospective notice; any change applies to the next billing cycle, not retroactively.</p>
              </div>
            </section>

            <section id="termination" className="mb-16">
              <h2 className="text-2xl font-semibold text-white mb-4">Termination</h2>
              <p className="text-zinc-400 text-sm leading-relaxed">You may stop using Cutline and delete your account at any time. We may suspend or terminate your account if you breach these terms, if we are required to by law, or if continuing to provide the service to you creates legal, security, or financial risk for us. We will give you notice when reasonably possible. On termination your right to use the service ends; certain provisions survive (intellectual property, disclaimers, liability caps, indemnity, governing law, dispute resolution).</p>
            </section>

            <section id="disclaimer" className="mb-16">
              <h2 className="text-2xl font-semibold text-white mb-4">No warranty</h2>
              <p className="text-zinc-400 text-sm leading-relaxed">To the maximum extent permitted by law, Cutline is provided &quot;as is&quot; and &quot;as available&quot;, without warranties of any kind, express or implied, including warranties of merchantability, fitness for a particular purpose, non-infringement, accuracy, or uninterrupted operation. We do not guarantee that the service will be error-free, that any specific output will match your expectations, or that defects will be corrected.</p>
            </section>

            {/* LEGAL REVIEW (liability cap): the USD $100 / 12-month-fees floor is a common SaaS pattern but is unenforceable against consumers in several jurisdictions (UK Consumer Rights Act 2015, EU Unfair Contract Terms Directive, certain Australian Consumer Law provisions). Counsel should confirm the cap holds in target markets and consider adding a higher cap for paid plans. */}
            <section id="liability" className="mb-16">
              <h2 className="text-2xl font-semibold text-white mb-4">Limitation of liability</h2>
              <p className="text-zinc-400 text-sm leading-relaxed mb-4">To the maximum extent permitted by law, in no event will Cutline, its affiliates, officers, employees, or agents be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits, lost revenue, lost data, or business interruption, arising out of or relating to the service, even if advised of the possibility.</p>
              <p className="text-zinc-400 text-sm leading-relaxed">Our total aggregate liability arising out of or relating to these terms or the service is limited to the greater of: (a) the total amount you paid us in the 12 months before the event giving rise to the claim, or (b) USD 100. Some jurisdictions do not allow these limitations, in which case they apply only to the extent permitted.</p>
            </section>

            {/* LEGAL REVIEW (indemnification): unilateral indemnity from consumers is rarely fully enforceable in EU/UK; counsel should consider scoping this to business users only, or carving out consumers, and consider whether to offer mutual IP-indemnity to enterprise customers. */}
            <section id="indemnity" className="mb-16">
              <h2 className="text-2xl font-semibold text-white mb-4">Indemnification</h2>
              <p className="text-zinc-400 text-sm leading-relaxed">You agree to indemnify and hold us harmless from claims, losses, and reasonable legal fees arising from (a) content you submit or generate via Cutline, (b) your breach of these terms, or (c) your violation of any third-party right or applicable law. We may take exclusive control of the defence of any indemnified claim at our expense.</p>
            </section>

            {/* LEGAL REVIEW (governing law / venue): Delaware is set as governing law and exclusive venue. If you market actively to EU/UK consumers, mandatory consumer-protection rules of the consumer's home jurisdiction may still apply notwithstanding this choice; counsel should confirm. Consider also adding a binding-arbitration / class-action-waiver clause for US consumers if appropriate to your risk profile. */}
            <section id="governing-law" className="mb-16">
              <h2 className="text-2xl font-semibold text-white mb-4">Governing law and disputes</h2>
              <p className="text-zinc-400 text-sm leading-relaxed mb-4">These terms and any dispute arising out of or relating to them or the service are governed by the laws of the State of Delaware, United States, without regard to its conflict-of-laws rules. The United Nations Convention on Contracts for the International Sale of Goods does not apply.</p>
              <p className="text-zinc-400 text-sm leading-relaxed mb-4">You and we agree that any action, suit, or proceeding arising out of or relating to these terms or the service will be brought exclusively in the state or federal courts located in New Castle County, Delaware, and you and we consent to the personal jurisdiction and venue of those courts and waive any objection to forum non conveniens.</p>
              <p className="text-zinc-400 text-sm leading-relaxed">Nothing in this section limits any non-waivable rights you may have as a consumer under the laws of your habitual residence. If you are an EU or UK consumer, the protections of mandatory consumer-protection laws of your country of residence continue to apply notwithstanding the choice of Delaware law above.</p>
            </section>

            <section id="changes" className="mb-16">
              <h2 className="text-2xl font-semibold text-white mb-4">Changes to these terms</h2>
              <p className="text-zinc-400 text-sm leading-relaxed">We may revise these terms as the product evolves. When we make material changes, we will revise the &quot;effective&quot; date at the top and, for changes that materially expand your obligations or our rights, give you at least 14 days&apos; advance notice by email or in-app banner. Continued use of Cutline after the effective date means you accept the revised terms. If you don&apos;t accept them, stop using the service before the effective date and we will refund any unused prepaid period.</p>
            </section>

            <section id="contact" className="mb-12">
              <h2 className="text-2xl font-semibold text-white mb-4">Contact</h2>
              <p className="text-zinc-400 text-sm leading-relaxed">Questions, notices, or legal correspondence: <a href={`mailto:${CONTACT_EMAIL}`} className="text-white underline hover:text-zinc-200">{CONTACT_EMAIL}</a>.</p>
            </section>

          </div>
        </div>
      </main>
    </div>
  );
}
