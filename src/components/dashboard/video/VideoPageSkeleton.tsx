import { Skeleton } from "@/components/ui/skeleton";

export function VideoPageSkeleton() {
  return (
    <div
      className="flex min-h-dvh flex-col bg-[#070708] min-[900px]:h-dvh min-[900px]:min-h-0"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Loading your video</span>
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-white/[0.065] px-4">
        <Skeleton className="h-4 w-16 rounded-full" />
        <Skeleton className="h-4 w-48 rounded-full max-[899px]:hidden" />
        <Skeleton className="h-[22px] w-16 rounded-full" />
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="h-[34px] w-24 rounded-[9px] max-[899px]:hidden" />
          <Skeleton className="h-[34px] w-[106px] rounded-[9px]" />
        </div>
      </div>
      <div className="flex flex-1 flex-col min-[900px]:grid min-[900px]:min-h-0 min-[900px]:grid-cols-[400px_minmax(0,1fr)] min-[1200px]:grid-cols-[440px_minmax(0,1fr)] min-[1700px]:grid-cols-[480px_minmax(0,1fr)]">
        <div className="order-2 flex flex-1 flex-col gap-5 border-t border-white/[0.065] bg-[#0b0b0d] p-[18px] min-[900px]:order-1 min-[900px]:border-r min-[900px]:border-t-0">
          <Skeleton className="h-4 w-28 rounded-full" />
          <Skeleton className="ml-auto h-24 w-[86%] rounded-2xl" />
          <div className="flex gap-3">
            <Skeleton className="size-[26px] shrink-0 rounded-lg" />
            <div className="flex flex-1 flex-col gap-2.5">
              <Skeleton className="h-3.5 w-3/4 rounded-full" />
              <Skeleton className="h-[70px] w-full rounded-[13px]" />
              <div className="flex flex-wrap gap-1.5">
                {["w-[88px]", "w-[120px]", "w-[84px]", "w-[96px]", "w-[132px]"].map((w) => (
                  <Skeleton key={w} className={`h-[30px] rounded-full ${w}`} />
                ))}
              </div>
            </div>
          </div>
          <Skeleton className="mt-auto h-[92px] w-full rounded-2xl max-[899px]:hidden" />
        </div>
        <div className="vd-canvas order-1 flex flex-col gap-4 px-3.5 pb-4 pt-3 min-[900px]:order-2 min-[900px]:px-8 min-[900px]:pb-[22px] min-[900px]:pt-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-[34px] w-24 rounded-[10px]" />
            <Skeleton className="h-3 w-40 rounded-full max-[899px]:hidden" />
          </div>
          <div className="grid flex-1 place-items-center">
            <Skeleton className="aspect-video w-full max-w-[1100px] rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
