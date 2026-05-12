import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 py-4 flex justify-start bg-black/60 backdrop-blur-sm border-b border-white/5">
        <Skeleton tone="dark" className="h-9 w-28 rounded-lg" />
      </div>

      <main className="pt-24 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[min(90vw,1760px)] mx-auto grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-10 lg:gap-14">

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
              <Skeleton tone="dark" className="h-3 w-24 rounded-full" />
              <div className="space-y-2.5 pt-1">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} tone="dark" className={`h-3.5 rounded-full ${i % 3 === 0 ? "w-full" : i % 3 === 1 ? "w-[85%]" : "w-3/4"}`} />
                ))}
              </div>
            </div>
          </aside>

          <div className="min-w-0 space-y-12">
            <section className="space-y-4">
              <Skeleton tone="dark" className="h-12 w-3/4 rounded-md" />
              <div className="space-y-2 pt-2">
                <Skeleton tone="dark" className="h-4 w-full rounded-full" />
                <Skeleton tone="dark" className="h-4 w-[95%] rounded-full" />
                <Skeleton tone="dark" className="h-4 w-4/5 rounded-full" />
              </div>
              <Skeleton tone="dark" className="h-3 w-2/3 rounded-full" />
            </section>

            {Array.from({ length: 4 }).map((_, blockIdx) => (
              <section key={blockIdx} className="space-y-4">
                <Skeleton tone="dark" className="h-7 w-1/2 rounded-md" />
                <div className="space-y-2">
                  <Skeleton tone="dark" className="h-3.5 w-full rounded-full" />
                  <Skeleton tone="dark" className="h-3.5 w-[92%] rounded-full" />
                  <Skeleton tone="dark" className="h-3.5 w-[88%] rounded-full" />
                  <Skeleton tone="dark" className="h-3.5 w-3/4 rounded-full" />
                </div>
                <div className="grid sm:grid-cols-2 gap-3 pt-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} tone="dark" className="h-24 rounded-xl" />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
