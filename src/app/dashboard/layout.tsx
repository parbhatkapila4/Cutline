import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getUserPlan } from "@/lib/users/planService";
import { getVideosCompletedThisMonth } from "@/lib/usage";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userId: string | undefined;

  try {
    const requestHeaders = new Headers(await headers());
    const session = await auth.api.getSession({ headers: requestHeaders });
    userId = session?.user?.id ? String(session.user.id) : undefined;
  } catch {
    userId = undefined;
  }

  if (userId) {
    const [plan, videosCompletedThisMonth] = await Promise.all([
      getUserPlan(userId),
      getVideosCompletedThisMonth(userId),
    ]);

    if (plan.id === "free" && plan.videosPerMonth != null && videosCompletedThisMonth >= plan.videosPerMonth) {
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
          <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-zinc-950/95 p-8 text-center shadow-2xl shadow-black/50">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-300">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Free plan limit reached</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              You have used the video included with your free plan. Please upgrade your plan to continue creating
              videos and regain access to the dashboard.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
              >
                Upgrade plan
              </Link>
              <Link
                href="/create"
                className="inline-flex items-center justify-center rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                Back to create
              </Link>
            </div>
          </div>
        </div>
      );
    }
  }

  return <div className="dashboard-root">{children}</div>;
}
