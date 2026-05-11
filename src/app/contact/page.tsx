"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { CutlineLogo } from "@/components/brand/CutlineLogo";

const BUDGET_OPTIONS = [
  "Less than $3K",
  "$3K-$5K",
  "$5K-$10K",
  "$10K-$20K",
  "More than $20K",
];

const INQUIRY_OPTIONS = [
  "General inquiry",
  "Video project",
  "Partnership",
  "Support",
  "Other",
];

export default function ContactPage() {
  const [budget, setBudget] = useState<string | null>(null);
  const [toast, setToast] = useState(false);
  const [budgetError, setBudgetError] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(false), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBudgetError(false);
    const form = formRef.current;
    if (!form) return;
    if (!form.reportValidity()) return;
    if (budget === null) {
      setBudgetError(true);
      return;
    }
    setToast(true);
  };

  return (
    <div className="h-screen bg-black overflow-hidden flex flex-col">
      <div className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-start">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-white border border-white/30 hover:bg-white/10 px-3 py-2 rounded-lg transition-colors"
        >
          <CutlineLogo size="sm" className="max-w-[140px]" />
          <span>Home</span>
        </Link>
      </div>

      <main className="pt-20 pb-16 px-4 sm:px-6 flex-1 min-h-0 overflow-hidden">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
            <div className="grid lg:grid-cols-2 min-h-[520px]">
              <div className="p-6 sm:p-8 flex flex-col bg-white min-h-0">
                <div className="shrink-0">
                  <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 leading-tight mb-3">
                    Let&apos;s make
                    <br />
                    problems nervous.
                  </h1>
                  <p className="text-zinc-600 text-base leading-relaxed max-w-sm">
                    Tell us what keeps you stuck, we&apos;ll turn it into your next competitive advantage.
                  </p>
                </div>
                <div className="flex-1 min-h-0 mt-4 relative w-full flex items-end justify-center lg:justify-start">
                  <div className="relative w-[90%] h-[90%]">
                    <Image
                      src="/contact-illustration.png"
                      alt="Person with laptop holding paper airplane"
                      fill
                      sizes="(max-width: 1024px) 90vw, 45vw"
                      className="object-cover object-bottom"
                    />
                    <span
                      className="absolute text-[0.6rem] sm:text-[0.7rem] font-bold tracking-widest text-black uppercase whitespace-nowrap"
                      style={{ top: "43%", left: "76%", transform: "translate(-50%, -50%)" }}
                      aria-hidden
                    >
                      cutline
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-8 sm:p-10 lg:p-12 bg-zinc-50/80 border-l border-zinc-200/80">
                <form
                  ref={formRef}
                  className="space-y-6"
                  onSubmit={handleSubmit}
                >
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-zinc-700 mb-1">
                      Full name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="name"
                      type="text"
                      required
                      className="w-full bg-transparent border-0 border-b-2 border-zinc-300 px-0 py-2 text-zinc-900 placeholder-zinc-400 focus:border-emerald-500 focus:ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 transition-colors"
                      placeholder="Your name"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="email"
                        type="email"
                        required
                        className="w-full bg-transparent border-0 border-b-2 border-zinc-300 px-0 py-2 text-zinc-900 placeholder-zinc-400 focus:border-emerald-500 focus:ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 transition-colors"
                        placeholder="you@example.com"
                      />
                    </div>
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-zinc-700 mb-1">
                        Phone number
                      </label>
                      <input
                        id="phone"
                        type="tel"
                        className="w-full bg-transparent border-0 border-b-2 border-zinc-300 px-0 py-2 text-zinc-900 placeholder-zinc-400 focus:border-emerald-500 focus:ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 transition-colors"
                        placeholder="+1 234 567 8900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="company" className="block text-sm font-medium text-zinc-700 mb-1">
                        Company name
                      </label>
                      <input
                        id="company"
                        type="text"
                        className="w-full bg-transparent border-0 border-b-2 border-zinc-300 px-0 py-2 text-zinc-900 placeholder-zinc-400 focus:border-emerald-500 focus:ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 transition-colors"
                        placeholder="Your company"
                      />
                    </div>
                    <div>
                      <label htmlFor="inquiry" className="block text-sm font-medium text-zinc-700 mb-1">
                        Inquiry reason <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="inquiry"
                        required
                        className="w-full bg-transparent border-0 border-b-2 border-zinc-300 px-0 py-2 text-zinc-900 focus:border-emerald-500 focus:ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 transition-colors appearance-none cursor-pointer"
                        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23717171'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 0 center", backgroundSize: "1.25rem" }}
                      >
                        <option value="">Select reason</option>
                        {INQUIRY_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <span className="block text-sm font-medium text-zinc-700 mb-3">
                      Project budget <span className="text-red-500">*</span>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {BUDGET_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => { setBudget(opt); setBudgetError(false); }}
                          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${budget === opt
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-zinc-300 text-zinc-600 hover:border-zinc-400 hover:bg-zinc-100"
                            }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    {budgetError && (
                      <p className="mt-2 text-sm text-red-500">Please select a project budget.</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="details" className="block text-sm font-medium text-zinc-700 mb-1">
                      Project details <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="details"
                      required
                      rows={4}
                      className="w-full h-28 min-h-28 max-h-28 bg-transparent border border-zinc-300 rounded-lg px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-emerald-500 focus:ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 transition-colors resize-none"
                      placeholder="Tell us about your project..."
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-4 rounded-xl transition-colors"
                  >
                    Let&apos;s connect
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7v10" />
                    </svg>
                  </button>
                </form>
              </div>
            </div>

            <div className="px-8 sm:px-10 lg:px-12 py-6 border-t border-zinc-200 bg-white flex flex-col sm:flex-row flex-wrap items-center justify-center gap-8 sm:gap-12 text-sm">
              <div className="text-center sm:text-left">
                <p className="text-zinc-500 mb-0.5">Work with us</p>
                <a href="mailto:parbhat@parbhat.work" className="font-medium text-zinc-900 hover:text-emerald-600 transition-colors">
                  parbhat@parbhat.work
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>

      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-xl bg-emerald-600 text-white font-medium shadow-lg animate-in"
          role="status"
          aria-live="polite"
        >
          Message sent successfully! We&apos;ll get back to you soon.
        </div>
      )}
    </div>
  );
}
