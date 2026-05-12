import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="bg-[#0a0a0a] h-9" aria-hidden />

      <header className="bg-white/90 border-b border-gray-200/70">
        <div className="max-w-[1440px] mx-auto flex items-center px-5 sm:px-8 h-[60px]">
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-[8px]" />
            <Skeleton className="h-4 w-16 rounded-md" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
      </header>

      <main className="pt-12 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto space-y-8">

          <div className="space-y-3">
            <Skeleton className="h-9 w-2/3 rounded-md" />
            <Skeleton className="h-4 w-full rounded-full" />
            <Skeleton className="h-4 w-3/4 rounded-full" />
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-5">
            <Skeleton className="h-3 w-20 rounded-full" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
            </div>
            <div className="flex items-center justify-between pt-2">
              <Skeleton className="h-4 w-32 rounded-full" />
              <Skeleton className="h-11 w-40 rounded-full" />
            </div>
          </div>

          <div className="space-y-3">
            <Skeleton className="h-3 w-32 rounded-full" />
            <div className="grid sm:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
