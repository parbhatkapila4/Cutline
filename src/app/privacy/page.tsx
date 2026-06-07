import Link from "next/link";
import { CutlineLogo } from "@/components/brand/CutlineLogo";

const SECTIONS = [
  { id: "summary", label: "Summary" },
  { id: "what-we-collect", label: "What we collect" },
  { id: "how-we-use", label: "How we use it" },
  { id: "third-parties", label: "Third parties" },
  { id: "ai-processing", label: "AI processing" },
  { id: "retention", label: "Data retention" },
  { id: "cookies", label: "Cookies" },
  { id: "your-rights", label: "Your rights" },
  { id: "gdpr", label: "GDPR (EU / UK)" },
  { id: "ccpa", label: "CCPA / CPRA (California)" },
  { id: "international", label: "International transfers" },
  { id: "children", label: "Children" },
  { id: "security", label: "Security" },
  { id: "changes", label: "Changes" },
  { id: "contact", label: "Contact" },
];

const EFFECTIVE_DATE = "10 May 2026";
const CONTACT_EMAIL = "parbhat@parbhat.work";

export default function PrivacyPage() {
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
              <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-[0.18em] mb-3">Privacy policy</p>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4">
                How we handle your data
              </h1>
              <p className="text-zinc-400 text-sm">Effective: {EFFECTIVE_DATE}</p>
            </section>

            <section id="summary" className="mb-16">
              <h2 className="text-2xl font-semibold text-white mb-4">Summary</h2>
              <ul className="space-y-2 text-zinc-400 text-sm leading-relaxed list-disc pl-5">
                <li>We collect the minimum needed to run the service: account info, the prompts and assets you submit, the videos we generate for you, and basic technical/operational logs.</li>
                <li>We send your prompts and scripts to third-party AI providers (OpenRouter, ElevenLabs or PlayHT, OpenAI, optionally Google Veo) so they can run the pipeline. Your prompts leave our servers when this happens.</li>
                <li>Generated videos and uploaded assets are deleted automatically after roughly 24 hours.</li>
                <li>We do not run third-party analytics, ad-tracking, or behavioural profiling on this site.</li>
                <li>Payments are processed by Dodo Payments. We never see or store your card number.</li>
                <li>You can request access, export, or deletion of your data at any time by writing to {CONTACT_EMAIL}.</li>
              </ul>
            </section>

            <section id="what-we-collect" className="mb-16">
              <h2 className="text-2xl font-semibold text-white mb-4">What we collect</h2>
              <div className="space-y-5 text-zinc-400 text-sm leading-relaxed">
                <div>
                  <h3 className="font-semibold text-zinc-200 mb-1">Account information</h3>
                  <p>If you sign up, we collect your email address, a hashed password (we never store the raw password), and an optional display name. If you sign in with Google, we receive your Google account email, profile name, and the OAuth identifier Google sends us. We do not request additional Google permissions.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-200 mb-1">Anonymous session data</h3>
                  <p>If you use Cutline without signing in, we set a first-party cookie containing an anonymous session identifier and we store the count of videos you have generated in that session. We do this so you can try the product before signing up. There is no advertising profile or cross-site tracking.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-200 mb-1">Inputs you give us</h3>
                  <p>The prompt sentence you type, any optional duration / mode / model selections, and any files you upload (logos, product photos, reference images). These are required to generate your video.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-200 mb-1">Generated outputs</h3>
                  <p>Intermediate artifacts produced by the pipeline (intent JSON, narrative, shot list, script, subtitle track, voice audio, sourced or generated images) and the final MP4. These are kept for the retention window described below.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-200 mb-1">Operational logs</h3>
                  <p>Job identifiers, status (pending / processing / completed / failed), per-stage timings, error messages, your IP address (used for rate limiting and abuse prevention), browser user-agent. We do not log the contents of your prompts in our application logs.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-200 mb-1">Billing data</h3>
                  <p>If you subscribe to a paid plan, our payment processor (Dodo Payments) handles your card data directly. They send us the plan you purchased, the status of your subscription, and a customer reference identifier. We do not see, store, or process your card number, CVV, or banking credentials.</p>
                </div>
              </div>
            </section>

            <section id="how-we-use" className="mb-16">
              <h2 className="text-2xl font-semibold text-white mb-4">How we use it</h2>
              <p className="text-zinc-400 text-sm leading-relaxed mb-4">We use the data described above only for the following purposes:</p>
              <ul className="space-y-2 text-zinc-400 text-sm leading-relaxed list-disc pl-5">
                <li>To run the video generation pipeline you requested.</li>
                <li>To authenticate you, maintain your session, and let you access your dashboard and past videos.</li>
                <li>To enforce rate limits, detect abuse (for example, repeated requests from the same IP), and keep the service stable.</li>
                <li>To process payments, manage subscriptions, and send transactional account emails (sign-in confirmations, payment receipts, important service notices).</li>
                <li>To investigate and fix bugs, by inspecting job metadata and error logs.</li>
                <li>To comply with our legal obligations and respond to lawful requests.</li>
              </ul>
              <p className="text-zinc-400 text-sm leading-relaxed mt-4">We do not sell your data. We do not share it with advertisers. We do not use your prompts or generated videos to train our own models.</p>
            </section>

            <section id="third-parties" className="mb-16">
              <h2 className="text-2xl font-semibold text-white mb-4">Third parties we share with</h2>
              <p className="text-zinc-400 text-sm leading-relaxed mb-5">To deliver the service we have to send some data to the following sub-processors. They each have their own privacy policies, which we recommend you read.</p>
              <div className="space-y-4">
                {[
                  { name: "OpenRouter", what: "The text of your prompt, intent, narrative, shot list, script, and any image-search queries we derive from them.", why: "Routes our LLM requests to the model you (or we) selected. Used in every text generation stage." },
                  { name: "ElevenLabs or PlayHT", what: "The script text we generate from your prompt.", why: "Converts the script into voiceover audio. You configure which provider via the TTS_PROVIDER setting." },
                  { name: "OpenAI", what: "Image prompts derived from your shot list. We never send your full prompt or account email.", why: "Generates fallback images via DALL·E 3 when no stock photo matches." },
                  { name: "Unsplash and Pexels", what: "Image search queries derived from your shot list.", why: "Returns stock photos used as the visual layer of each shot. Standard image-search API requests." },
                  { name: "Google (Gemini / Veo)", what: "Used only if you select \"Talking object\" mode. The script text is sent to Google Veo to generate the talking character clip.", why: "Generates AI character video. Optional and only triggered when you explicitly choose this mode." },
                  { name: "Better Auth + Google OAuth", what: "If you sign in with Google: your Google email, name, and OAuth identifier.", why: "Authenticates you and creates your account record." },
                  { name: "Dodo Payments", what: "Your email address and the plan you are purchasing. Card data goes directly to them, not to us.", why: "Processes subscriptions and one-time payments. PCI-DSS compliant; we are not in scope for cardholder data." },
                  { name: "Neon (Postgres)", what: "Account records, job metadata, anonymous-session records, subscription state.", why: "Database hosting." },
                  { name: "Redis", what: "Job queue entries, cancellation flags, rate-limit counters.", why: "Queue and ephemeral state. May be hosted by a managed Redis provider." },
                  { name: "Object storage (optional)", what: "Uploaded assets and generated videos.", why: "Either local disk on our server or S3-compatible object storage. Files are deleted on the retention schedule below." },
                ].map((sub) => (
                  <div key={sub.name} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <h3 className="font-semibold text-zinc-200 text-sm mb-1.5">{sub.name}</h3>
                    <p className="text-zinc-400 text-xs leading-relaxed mb-1.5"><span className="text-zinc-300 font-medium">What we send:</span> {sub.what}</p>
                    <p className="text-zinc-400 text-xs leading-relaxed"><span className="text-zinc-300 font-medium">Why:</span> {sub.why}</p>
                  </div>
                ))}
              </div>
            </section>

            <section id="ai-processing" className="mb-16">
              <h2 className="text-2xl font-semibold text-white mb-4">AI processing notice</h2>
              <p className="text-zinc-400 text-sm leading-relaxed mb-4">Cutline is an AI-driven video tool. Several things follow from that:</p>
              <ul className="space-y-2 text-zinc-400 text-sm leading-relaxed list-disc pl-5">
                <li>Your prompts and any uploaded assets are processed by third-party AI providers (listed above) outside our infrastructure. Each of those providers may temporarily process your input on their own servers.</li>
                <li>Generated content (script, voiceover, images, video) is statistical output. It may be inaccurate, biased, or factually wrong. You are responsible for reviewing it before publishing or relying on it.</li>
                <li>Do not put confidential, personal-health, or other sensitive information in prompts or uploads. Anything you submit will leave our servers as part of the pipeline described above.</li>
                <li>We do not use your prompts, uploads, or generated videos to train our own models. Whether the third-party providers do is governed by their own policies; check their terms before submitting sensitive material.</li>
              </ul>
            </section>

            <section id="retention" className="mb-16">
              <h2 className="text-2xl font-semibold text-white mb-4">Data retention</h2>
              <ul className="space-y-2 text-zinc-400 text-sm leading-relaxed list-disc pl-5">
                <li><span className="text-zinc-300 font-medium">Generated MP4 videos:</span> deleted automatically approximately 24 hours after they are produced. Download yours within the window.</li>
                <li><span className="text-zinc-300 font-medium">Uploaded assets (logos, product photos):</span> deleted approximately 24 hours after upload.</li>
                <li><span className="text-zinc-300 font-medium">Per-job temp files:</span> deleted as soon as the job finishes, regardless of success or failure.</li>
                <li><span className="text-zinc-300 font-medium">Job records (status, timing, error metadata):</span> kept while your account is active so you can see history; deleted with your account.</li>
                <li><span className="text-zinc-300 font-medium">Account data:</span> kept until you delete your account or close it. After deletion we retain only what is required for legal, tax, fraud-prevention, or accounting purposes.</li>
                <li><span className="text-zinc-300 font-medium">Anonymous-session records:</span> kept for the lifetime of the cookie. Clearing your browser or cookies effectively deletes them.</li>
                <li><span className="text-zinc-300 font-medium">Logs:</span> kept up to 90 days for operational and security purposes.</li>
              </ul>
            </section>

            <section id="cookies" className="mb-16">
              <h2 className="text-2xl font-semibold text-white mb-4">Cookies</h2>
              <p className="text-zinc-400 text-sm leading-relaxed mb-4">We set the following first-party cookies on the <span className="text-zinc-200">cutline.cloud</span> domain. We do not set third-party advertising or analytics cookies.</p>
              <ul className="space-y-2 text-zinc-400 text-sm leading-relaxed list-disc pl-5">
                <li><span className="text-zinc-300 font-medium">Authentication session:</span> set after you sign in. Used to keep you signed in. Deleted when you sign out.</li>
                <li><span className="text-zinc-300 font-medium">Anonymous session:</span> set on first visit if you have not signed in. Stores an opaque session identifier so you can try a free generation.</li>
                <li><span className="text-zinc-300 font-medium">Idempotency / rate-limit:</span> short-lived cookies used to prevent duplicate submissions and enforce per-IP limits.</li>
              </ul>
            </section>

            <section id="your-rights" className="mb-16">
              <h2 className="text-2xl font-semibold text-white mb-4">Your rights</h2>
              <p className="text-zinc-400 text-sm leading-relaxed mb-4">Depending on where you live, you may have rights under laws such as GDPR (EU/UK), CCPA/CPRA (California), or similar regimes. These commonly include:</p>
              <ul className="space-y-2 text-zinc-400 text-sm leading-relaxed list-disc pl-5">
                <li>The right to know what personal data we hold about you and to receive a copy.</li>
                <li>The right to correct inaccurate data.</li>
                <li>The right to delete your account and personal data, subject to limited legal retention.</li>
                <li>The right to object to or restrict certain processing.</li>
                <li>The right to data portability (export).</li>
                <li>The right to withdraw consent where processing is based on consent.</li>
                <li>The right to lodge a complaint with your local data protection authority.</li>
              </ul>
              <p className="text-zinc-400 text-sm leading-relaxed mt-4">To exercise any of these, write to {CONTACT_EMAIL} from the email address associated with your account. We will respond within 30 days. We will not retaliate against you for exercising your rights.</p>
            </section>

            <section id="gdpr" className="mb-16">
              <h2 className="text-2xl font-semibold text-white mb-4">GDPR (EU / UK)</h2>
              <p className="text-zinc-400 text-sm leading-relaxed mb-4">If you are in the European Economic Area, the United Kingdom, or Switzerland, the General Data Protection Regulation (and the equivalent UK GDPR / Swiss FADP) gives you the rights summarised in &quot;Your rights&quot; above. This section explains how we apply those rules.</p>
              <div className="space-y-4 text-zinc-400 text-sm leading-relaxed">
                <div>
                  <h3 className="font-semibold text-zinc-200 mb-1">Data controller</h3>
                  <p>Cutline, operating the service at <span className="text-zinc-200">cutline.cloud</span>, acts as the data controller for personal data you submit to operate your account and use the service. You can reach the controller at {CONTACT_EMAIL}.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-200 mb-1">Legal bases (Art. 6 GDPR)</h3>
                  <ul className="space-y-1.5 list-disc pl-5 mt-2">
                    <li><span className="text-zinc-300 font-medium">Performance of a contract</span>: to create your account, run the pipeline you requested, deliver the generated MP4, and provide your dashboard.</li>
                    <li><span className="text-zinc-300 font-medium">Legitimate interests</span>: to keep the service stable, prevent abuse, enforce rate limits, secure our infrastructure, debug errors, and communicate transactional notices. We have balanced these interests against your rights and freedoms.</li>
                    <li><span className="text-zinc-300 font-medium">Legal obligation</span>: where we must retain or disclose data to comply with tax, accounting, or law-enforcement requirements.</li>
                    <li><span className="text-zinc-300 font-medium">Consent</span>: used only where we explicitly ask (for example, optional marketing emails, where applicable). You can withdraw consent at any time without affecting prior processing.</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-200 mb-1">Right to lodge a complaint</h3>
                  <p>If you believe our processing of your personal data infringes the GDPR, you can lodge a complaint with the supervisory authority in the EU/EEA member state of your habitual residence, place of work, or place of the alleged infringement, or with the UK Information Commissioner&apos;s Office (ICO) for UK residents.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-200 mb-1">Automated decision-making</h3>
                  <p>The Cutline pipeline produces video output by automated means, but we do not make decisions that produce legal or similarly significant effects on you within the meaning of Art. 22 GDPR. The output is creative content delivered to you for review and use.</p>
                </div>
              </div>
            </section>

            <section id="ccpa" className="mb-16">
              <h2 className="text-2xl font-semibold text-white mb-4">CCPA / CPRA (California)</h2>
              <p className="text-zinc-400 text-sm leading-relaxed mb-4">If you are a California resident, the California Consumer Privacy Act and California Privacy Rights Act give you specific rights regarding your personal information.</p>
              <div className="space-y-4 text-zinc-400 text-sm leading-relaxed">
                <div>
                  <h3 className="font-semibold text-zinc-200 mb-1">Categories of personal information collected</h3>
                  <p>In the last 12 months we have collected the following categories of personal information about California users, all from the user directly:</p>
                  <ul className="space-y-1.5 list-disc pl-5 mt-2">
                    <li><span className="text-zinc-300 font-medium">Identifiers</span>: name, email address, account identifier, IP address.</li>
                    <li><span className="text-zinc-300 font-medium">Commercial information</span>: subscription plan, transaction history (returned to us by our payment processors).</li>
                    <li><span className="text-zinc-300 font-medium">Internet or other electronic network activity</span>: session cookies, anonymous-funnel session identifiers, request logs (IP, user-agent, timestamps).</li>
                    <li><span className="text-zinc-300 font-medium">User-generated content</span>: prompts you submit, files you upload, configuration choices.</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-200 mb-1">We do not sell or share your personal information</h3>
                  <p>We do not sell personal information for monetary value, and we do not share personal information for cross-context behavioural advertising as those terms are defined under the CPRA. We do not knowingly sell or share the personal information of consumers under 16.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-200 mb-1">Sensitive personal information</h3>
                  <p>We do not collect sensitive personal information as defined by the CPRA, and therefore do not use or disclose it in a way that triggers your right to limit. Account passwords are stored as cryptographic hashes only.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-200 mb-1">Your California rights</h3>
                  <ul className="space-y-1.5 list-disc pl-5 mt-2">
                    <li><span className="text-zinc-300 font-medium">Right to know</span>: what categories and specific pieces of personal information we have collected, the sources, the purposes, and the categories of third parties with whom we shared it.</li>
                    <li><span className="text-zinc-300 font-medium">Right to delete</span>: your personal information, subject to limited statutory exceptions.</li>
                    <li><span className="text-zinc-300 font-medium">Right to correct</span>: inaccurate personal information we hold about you.</li>
                    <li><span className="text-zinc-300 font-medium">Right to opt out of sale or sharing</span>: not applicable in practice because we do neither, but the right exists if our practices ever change.</li>
                    <li><span className="text-zinc-300 font-medium">Right to limit use of sensitive personal information</span>: not applicable because we do not collect it.</li>
                    <li><span className="text-zinc-300 font-medium">Right to non-discrimination</span>: we will not deny service, charge different prices, or provide a different level of service because you exercise a CCPA/CPRA right.</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-200 mb-1">How to make a request</h3>
                  <p>Email {CONTACT_EMAIL} from the address associated with your account. We may need to verify your identity before fulfilling certain requests. Authorised agents may submit requests on your behalf with appropriate written authorisation.</p>
                </div>
              </div>
            </section>

            <section id="international" className="mb-16">
              <h2 className="text-2xl font-semibold text-white mb-4">International transfers</h2>
              <p className="text-zinc-400 text-sm leading-relaxed">Cutline and its sub-processors operate from servers in multiple jurisdictions, including the United States and the European Union. If you access the service from outside those jurisdictions, your data will be transferred to and processed in them. We rely on the standard contractual clauses or equivalent safeguards offered by our sub-processors where applicable.</p>
            </section>

            <section id="children" className="mb-16">
              <h2 className="text-2xl font-semibold text-white mb-4">Children</h2>
              <p className="text-zinc-400 text-sm leading-relaxed">Cutline is not directed to children under 16, and we do not knowingly collect personal data from them. If you believe a child has provided us personal data, contact {CONTACT_EMAIL} and we will delete it.</p>
            </section>

            <section id="security" className="mb-16">
              <h2 className="text-2xl font-semibold text-white mb-4">Security</h2>
              <p className="text-zinc-400 text-sm leading-relaxed">We use industry-standard practices: TLS for data in transit, hashed passwords, scoped API keys held server-side, and access controls on our database and storage. No system is perfectly secure; if we ever experience a data breach affecting your personal data, we will notify you and the relevant authorities as required by law.</p>
            </section>

            <section id="changes" className="mb-16">
              <h2 className="text-2xl font-semibold text-white mb-4">Changes to this policy</h2>
              <p className="text-zinc-400 text-sm leading-relaxed">We may update this policy as the product evolves. When we make material changes we will revise the &quot;effective&quot; date at the top of the page and, for changes that materially expand how we use your data, send a notice to your account email or display an in-app banner. Continued use of Cutline after a change means you accept the updated policy.</p>
            </section>

            <section id="contact" className="mb-12">
              <h2 className="text-2xl font-semibold text-white mb-4">Contact</h2>
              <p className="text-zinc-400 text-sm leading-relaxed">Questions, requests, or complaints about this policy or your data: <a href={`mailto:${CONTACT_EMAIL}`} className="text-white underline hover:text-zinc-200">{CONTACT_EMAIL}</a>.</p>
            </section>

          </div>
        </div>
      </main>
    </div>
  );
}
