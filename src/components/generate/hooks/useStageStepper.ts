import { useEffect, useRef, useState } from "react";
import { STAGE_INTERVAL_MS, type JobStatus } from "@/components/generate/constants";

export function useStageStepper(jobId: string | null, status: JobStatus | null, stagesCount: number) {
  const [stage, setStage] = useState(0);
  const stageRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (jobId && (status === "pending" || status === "processing")) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStage(0);
      stageRef.current = setInterval(() => {
        setStage((s) => Math.min(s + 1, stagesCount - 1));
      }, STAGE_INTERVAL_MS);
      return () => {
        if (stageRef.current) clearInterval(stageRef.current);
      };
    }
    return undefined;
  }, [jobId, status, stagesCount]);

  const stopStageStepper = () => {
    if (stageRef.current) {
      clearInterval(stageRef.current);
      stageRef.current = null;
    }
  };

  return { stage, setStage, stopStageStepper };
}
