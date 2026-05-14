import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 py-4 flex justify-start bg-black/60 backdrop-blur-sm border-b border-white/5">
        <Skeleton tone="dark" className="h-9 w-28 rounded-lg" />
      </div>

      <main className="pt-24 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[min(90vw,1760px)] mx-auto">

          <div className="text-center space-y-4 mb-14">
            <Skeleton tone="dark" className="h-5 w-24 rounded-full mx-auto" />
            <Skeleton tone="dark" className="h-12 sm:h-14 w-3/4 max-w-2xl rounded-md mx-auto" />
            <div className="space-y-2 pt-2 max-w-xl mx-auto">
              <Skeleton tone="dark" className="h-4 w-full rounded-full" />
              <Skeleton tone="dark" className="h-4 w-3/4 rounded-full mx-auto" />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-5 max-w-[1180px] mx-auto">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className={`relative rounded-2xl p-7 flex flex-col ${
                  i === 1
                    ? "bg-white/[0.02] ring-1 ring-white/10 -mt-3 md:-mt-5 min-h-[480px]"
                    : "bg-white/[0.02] ring-1 ring-white/[0.06] min-h-[460px]"
                }`}
              >
                <div className="space-y-3">
                  <Skeleton tone="dark" className="h-4 w-24 rounded-full" />
                  <Skeleton tone="dark" className="h-3 w-full rounded-full" />
                  <Skeleton tone="dark" className="h-3 w-3/4 rounded-full" />
                </div>
                <div className="flex items-baseline gap-2 mt-7">
                  <Skeleton tone="dark" className="h-12 w-24 rounded-md" />
                  <Skeleton tone="dark" className="h-4 w-10 rounded-full" />
                </div>
                <Skeleton tone="dark" className="h-11 rounded-xl mt-7" />
                <div className="pt-6 mt-7 border-t border-white/10 space-y-3">
                  <Skeleton tone="dark" className="h-3 w-20 rounded-full" />
                  {Array.from({ length: 5 }).map((_, j) => (
                    <div key={j} className="flex items-center gap-2.5">
                      <Skeleton tone="dark" className="w-3.5 h-3.5 rounded-sm" />
                      <Skeleton
                        tone="dark"
                        className={`h-3 rounded-full ${j % 2 === 0 ? "w-[85%]" : "w-2/3"}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-7">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} tone="dark" className="h-3.5 w-32 rounded-full" />
            ))}
          </div>

        </div>
      </main>
    </div>
  );
}
