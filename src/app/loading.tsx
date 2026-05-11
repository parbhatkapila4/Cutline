import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="bg-[#0a0a0a] h-9" aria-hidden />

      <header className="bg-white/90 border-b border-gray-200/70">
        <div className="max-w-[1440px] mx-auto flex items-center px-5 sm:px-8 h-[60px]">
          <div className="flex items-center gap-2 mr-7 sm:mr-9">
            <Skeleton className="w-8 h-8 rounded-[8px]" />
            <Skeleton className="h-4 w-16 rounded-md" />
          </div>
          <div className="hidden md:flex items-center gap-1">
            <Skeleton className="h-4 w-16 rounded-md mx-3" />
            <Skeleton className="h-4 w-14 rounded-md mx-3" />
            <Skeleton className="h-4 w-20 rounded-md mx-3" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
        </div>
      </header>

      <section className="relative pt-12 sm:pt-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="max-w-[min(96vw,1680px)] mx-auto">
          <div className="grid lg:grid-cols-[minmax(260px,300px)_1fr] gap-8 lg:gap-12 items-start pt-8">

            <div className="pt-2 space-y-5">
              <Skeleton className="h-5 w-40 rounded-full" />
              <div className="space-y-3">
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-10 w-3/4 rounded-md" />
              </div>
              <div className="space-y-2 pt-2">
                <Skeleton className="h-3.5 w-full rounded-full" />
                <Skeleton className="h-3.5 w-11/12 rounded-full" />
                <Skeleton className="h-3.5 w-3/4 rounded-full" />
              </div>
              <div className="flex items-center gap-2 pt-3">
                <Skeleton className="h-10 w-32 rounded-md" />
                <Skeleton className="h-10 w-32 rounded-md" />
              </div>
            </div>

            <div className="relative w-full aspect-[1.9/1]">
              <Skeleton className="absolute inset-0 rounded-2xl" />
            </div>

          </div>

          <div className="border-t border-gray-200 mt-16 py-7">
            <div className="flex items-center justify-around flex-wrap gap-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-20 rounded-md" />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
