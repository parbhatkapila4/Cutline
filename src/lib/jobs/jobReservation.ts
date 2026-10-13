import { adjustSpendUsd, releaseCinematicSecondsOnce } from "@/lib/cost/budget";
import type { VideoJobData } from "@/lib/queue/videoQueue";
import { releaseVideoOnce } from "@/lib/usage";

function reservationOwner(data: VideoJobData | undefined): string | null {
  const id = data?.spendIdentifier || data?.clientId;
  return typeof id === "string" && id ? id : null;
}

export async function releaseJobVideo(
  jobId: string,
  data: VideoJobData | undefined
): Promise<boolean> {
  const identifier = reservationOwner(data);
  const month = data?.reservedVideoMonth;
  if (!identifier || !month) return false;
  return releaseVideoOnce(identifier, month, jobId);
}

export async function releaseUnstartedJobReservation(
  jobId: string,
  data: VideoJobData | undefined
): Promise<void> {
  const identifier = reservationOwner(data);
  if (!identifier) return;
  try {
    await releaseJobVideo(jobId, data);
    const seconds = typeof data?.reservedCinematicSeconds === "number" ? data.reservedCinematicSeconds : 0;
    if (seconds > 0) {
      await releaseCinematicSecondsOnce(
        identifier,
        seconds,
        data?.reservedCinematicSplit ?? { fromMonthly: seconds, fromTopup: 0 },
        jobId
      );
    }
    const spendUsd = typeof data?.reservedSpendUsd === "number" ? data.reservedSpendUsd : 0;
    if (spendUsd > 0) await adjustSpendUsd(identifier, -spendUsd);
  } catch (e) {
    console.error(
      `[reservation] jobId=${jobId} could not release the reservation of a job removed before it started. ` +
      `error=${e instanceof Error ? e.message : String(e)}`
    );
  }
}
