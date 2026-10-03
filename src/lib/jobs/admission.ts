import { ErrorCode } from "@/lib/api/errors";
import {
  adjustSpendUsd,
  decideSpend,
  getBudgetState,
  releaseCinematicSeconds,
  reserveCinematicSeconds,
  reserveSpendUsd,
  resetsAt,
} from "@/lib/cost/budget";
import { cinematicSecondsFor, estimateUnmeteredCostUsd } from "@/lib/cost/pricing";
import type { VideoJobData } from "@/lib/queue/videoQueue";
import { getVideosCompletedThisMonth } from "@/lib/usage";
import { getUserPlan } from "@/lib/users/planService";

export type Reservation = {
  identifier: string;
  spendUsd: number;
  cinematicSeconds: number;
  cinematicSplit: { fromMonthly: number; fromTopup: number };
};

export type AdmissionRequest = Pick<
  VideoJobData,
  | "mode"
  | "durationSeconds"
  | "variationCount"
  | "talkingObjectStyle"
  | "talkingRealMode"
  | "avatar"
  | "stockImagesOnly"
>;

export type Admission =
  | { ok: true; mode: "slideshow" | "talking_object"; notice: string | null }
  | {
    ok: false;
    error: {
      code: typeof ErrorCode.MONTHLY_LIMIT_REACHED;
      message: string;
      status: 402;
      details: Record<string, unknown>;
    };
  };

export function emptyReservation(identifier: string): Reservation {
  return {
    identifier,
    spendUsd: 0,
    cinematicSeconds: 0,
    cinematicSplit: { fromMonthly: 0, fromTopup: 0 },
  };
}

function refuse(message: string, details: Record<string, unknown>): Admission {
  return {
    ok: false,
    error: { code: ErrorCode.MONTHLY_LIMIT_REACHED, message, status: 402, details },
  };
}

export async function admitVideoJob(
  reservation: Reservation,
  request: AdmissionRequest
): Promise<Admission> {
  const requestedMode = request.mode ?? "slideshow";
  const creditsCheckRequested =
    process.env.DISABLE_CREDITS_CHECK === "true" || process.env.DISABLE_CREDITS_CHECK === "1";
  const creditsCheckDisabled =
    creditsCheckRequested && process.env.NODE_ENV !== "production";
  if (creditsCheckRequested && !creditsCheckDisabled) {
    console.warn(
      "[api] DISABLE_CREDITS_CHECK is set but ignored in production; spend limits remain enforced."
    );
  }
  if (creditsCheckDisabled) {
    return { ok: true, mode: requestedMode, notice: null };
  }

  const spendIdentifier = reservation.identifier;
  const userPlan = await getUserPlan(spendIdentifier);
  const requestedDuration = request.durationSeconds ?? 30;
  const requestedVariations = request.variationCount ?? 1;
  const stockImagesOnly = request.stockImagesOnly === true;
  const providerArgs = {
    talkingObjectStyle: request.talkingObjectStyle,
    talkingRealMode: request.talkingRealMode,
    avatar: request.avatar,
  };
  const costArgs = {
    mode: requestedMode,
    durationSeconds: requestedDuration,
    variationCount: requestedVariations,
    ...providerArgs,
    stockImagesOnly,
  };
  const budgetState = await getBudgetState(spendIdentifier, userPlan.id);
  const decision = decideSpend({
    state: budgetState,
    estimateUsd: estimateUnmeteredCostUsd(costArgs),
    cinematicSeconds: cinematicSecondsFor(costArgs),
    fallbackEstimateUsd: estimateUnmeteredCostUsd({
      mode: "slideshow",
      durationSeconds: requestedDuration,
      variationCount: requestedVariations,
      stockImagesOnly,
    }),
  });

  if (decision.outcome === "deny") {
    return refuse(decision.reason, {
      plan: userPlan.id,
      allowanceUsedPercent: Math.round(decision.state.fractionUsed * 100),
      resetsAt: resetsAt(),
    });
  }
  const admittedMode = decision.outcome === "downgrade" ? decision.toMode : requestedMode;
  const notice = decision.outcome === "downgrade" ? decision.reason : null;
  const admittedArgs = { ...costArgs, mode: admittedMode };

  const seconds = cinematicSecondsFor(admittedArgs);
  if (seconds > 0) {
    const cine = await reserveCinematicSeconds(
      spendIdentifier,
      budgetState.cinematicSecondsAllowed,
      seconds
    );
    if (!cine.ok) {
      return refuse(
        "Cinematic seconds for this month are used up. Standard renders are still available, and this resets next month.",
        { plan: userPlan.id, resetsAt: resetsAt() }
      );
    }
    reservation.cinematicSeconds = seconds;
    reservation.cinematicSplit = {
      fromMonthly: cine.fromMonthly ?? seconds,
      fromTopup: cine.fromTopup ?? 0,
    };
  }

  const spendToReserve = estimateUnmeteredCostUsd(admittedArgs);
  const claim = await reserveSpendUsd(
    spendIdentifier,
    budgetState.budgetUsd,
    spendToReserve
  );
  reservation.spendUsd = claim.reserved;
  if (!claim.ok) {
    return refuse(
      "You have used this month's generation allowance. It resets at the start of next month.",
      { plan: userPlan.id, resetsAt: resetsAt() }
    );
  }

  const videosCompletedThisMonth = await getVideosCompletedThisMonth(spendIdentifier);
  if (
    userPlan.videosPerMonth != null &&
    videosCompletedThisMonth >= userPlan.videosPerMonth
  ) {
    return refuse(
      "Your current plan limit has been reached. Please upgrade to continue creating videos.",
      {
        videosUsed: videosCompletedThisMonth,
        videosLimit: userPlan.videosPerMonth,
        plan: userPlan.id,
      }
    );
  }

  return { ok: true, mode: admittedMode, notice };
}

export function reservationJobFields(
  reservation: Reservation
): Pick<VideoJobData, "reservedSpendUsd" | "reservedCinematicSeconds" | "reservedCinematicSplit"> {
  return {
    ...(reservation.spendUsd > 0 ? { reservedSpendUsd: reservation.spendUsd } : {}),
    ...(reservation.cinematicSeconds > 0
      ? {
        reservedCinematicSeconds: reservation.cinematicSeconds,
        reservedCinematicSplit: { ...reservation.cinematicSplit },
      }
      : {}),
  };
}

export async function releaseReservation(reservation: Reservation): Promise<void> {
  if (reservation.cinematicSeconds <= 0 && reservation.spendUsd <= 0) return;
  try {
    if (reservation.cinematicSeconds > 0) {
      await releaseCinematicSeconds(
        reservation.identifier,
        reservation.cinematicSeconds,
        reservation.cinematicSplit
      );
    }
    if (reservation.spendUsd > 0) {
      await adjustSpendUsd(reservation.identifier, -reservation.spendUsd);
    }
  } catch (e) {
    console.error(
      `[admission] FAILED to release reservation for ${reservation.identifier}; ` +
      `leaked spendUsd=${reservation.spendUsd} cinematicSeconds=${reservation.cinematicSeconds}. ` +
      `error=${e instanceof Error ? e.message : String(e)}`
    );
  }
}
