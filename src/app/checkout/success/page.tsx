"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [plan, setPlan] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const missingSession = !sessionId;
  const resolvedStatus = missingSession ? "error" : status;
  const resolvedErrorMsg =
    missingSession
      ? "Missing payment session. Please return to pricing and try again."
      : errorMsg;

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;

    const verify = async () => {
      try {
        const res = await fetch("/api/checkout/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        if (cancelled) return;
        const data = await res.json();
        if (data.success) {
          setStatus("success");
          setPlan(data.plan);
        } else {
          setStatus("error");
          setErrorMsg(data.reason || "Payment verification failed.");
        }
      } catch {
        if (!cancelled) {
          setStatus("error");
          setErrorMsg("Unable to reach the server. Please try refreshing the page or contact support.");
        }
      }
    };

    verify();
    return () => { cancelled = true; };
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-lg text-center">
        {resolvedStatus === "verifying" && (
          <div>
            <div className="mx-auto mb-6 h-12 w-12 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            <h1 className="text-xl font-semibold">Verifying your payment&hellip;</h1>
            <p className="text-sm text-zinc-400 mt-2">This will only take a moment.</p>
          </div>
        )}

        {resolvedStatus === "success" && (
          <div>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
              <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Payment successful</h1>
            <p className="text-sm text-zinc-400 mt-3 leading-relaxed">
              Your account has been upgraded to the{" "}
              <span className="text-white font-semibold capitalize">{plan}</span> plan.
              You now have access to all features included in your new plan.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
              >
                Go to Dashboard
              </Link>
              <Link
                href="/create"
                className="inline-flex items-center justify-center rounded-xl border border-white/10 px-6 py-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                Create a video
              </Link>
            </div>
          </div>
        )}

        {resolvedStatus === "error" && (
          <div>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15">
              <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Verification issue</h1>
            <p className="text-sm text-zinc-400 mt-3 leading-relaxed">{resolvedErrorMsg}</p>
            <p className="text-xs text-zinc-500 mt-4">
              If you were charged and still see this error, please contact support. We will resolve it promptly.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-xl border border-white/10 px-6 py-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                Back to Pricing
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-xl border border-white/10 px-6 py-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                Contact Support
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="mx-auto h-12 w-12 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
