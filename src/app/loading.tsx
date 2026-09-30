import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#161514] text-[#f4f3f3]">
      <div className="mx-auto w-full max-w-[1400px] px-5 sm:px-10">
        <div className="h-[42px] rounded-[10px] bg-[#2a2827] mt-5" aria-hidden />

        <div className="flex h-[76px] items-center">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-7 w-7 rounded-[7px]" />
            <Skeleton className="h-4 w-16 rounded-md" />
          </div>
          <div className="mx-auto hidden items-center gap-8 md:flex">
            <Skeleton className="h-3.5 w-16 rounded-full" />
            <Skeleton className="h-3.5 w-14 rounded-full" />
            <Skeleton className="h-3.5 w-24 rounded-full" />
            <Skeleton className="h-3.5 w-10 rounded-full" />
          </div>
          <div className="ml-auto flex items-center gap-2.5">
            <Skeleton className="h-10 w-[112px] rounded-full" />
            <Skeleton className="hidden h-10 w-[112px] rounded-full sm:block" />
          </div>
        </div>

        <div className="grid gap-y-10 pl-6 pt-16 sm:pl-10 sm:pt-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-x-14 lg:pt-24 xl:gap-x-20">
          <div className="max-w-[620px] space-y-7">
            <Skeleton className="h-6 w-[190px] rounded-[5px]" />
            <div className="space-y-3">
              <Skeleton className="h-[52px] w-[88%] rounded-lg sm:h-[64px]" />
              <Skeleton className="h-[52px] w-[96%] rounded-lg sm:h-[64px]" />
            </div>
            <div className="max-w-[470px] space-y-2.5 pt-1">
              <Skeleton className="h-4 w-full rounded-full" />
              <Skeleton className="h-4 w-[94%] rounded-full" />
              <Skeleton className="h-4 w-[70%] rounded-full" />
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Skeleton className="h-[52px] w-[196px] rounded-full" />
              <Skeleton className="h-[52px] w-[186px] rounded-full" />
            </div>
            <Skeleton className="h-3.5 w-[260px] rounded-full" />
          </div>

          <div className="rounded-[26px] border border-[#f4f3f3]/12 bg-[#1f1e1d]/80 p-2.5 lg:self-center">
            <div className="flex items-center justify-between px-2.5 pb-2.5 pt-1.5">
              <div className="flex items-center gap-[5px]" aria-hidden>
                <span className="h-[7px] w-[7px] rounded-full bg-[#f4f3f3]/18" />
                <span className="h-[7px] w-[7px] rounded-full bg-[#f4f3f3]/18" />
                <span className="h-[7px] w-[7px] rounded-full bg-[#f4f3f3]/18" />
              </div>
              <Skeleton className="h-2.5 w-28 rounded-full" />
              <Skeleton className="h-2.5 w-10 rounded-full" />
            </div>
            <Skeleton className="h-[46px] w-full rounded-[14px]" />
            <Skeleton className="mt-2.5 aspect-[16/9] w-full rounded-[16px]" />
            <Skeleton className="mt-2.5 h-[42px] w-full rounded-[12px]" />
            <div className="mt-2 grid grid-cols-5 gap-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[16/9] rounded-[8px]" />
              ))}
            </div>
            <div className="px-1.5 pb-1 pt-3.5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-2.5 w-32 rounded-full" />
                <Skeleton className="h-2.5 w-8 rounded-full" />
              </div>
              <div className="mt-2.5 flex gap-[3px]">
                {Array.from({ length: 12 }).map((_, i) => (
                  <span
                    key={i}
                    className="h-[3px] flex-1 rounded-full bg-[#f4f3f3]/10"
                  />
                ))}
              </div>
            </div>
          </div>

          <dl className="grid max-w-[620px] grid-cols-3 gap-x-6 border-t border-[#f4f3f3]/12 pt-8 lg:col-start-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2.5">
                <Skeleton className="h-7 w-14 rounded-md" />
                <Skeleton className="h-2.5 w-24 rounded-full" />
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
