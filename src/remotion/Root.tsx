import { Composition } from "remotion";
import { CUTLINEComposition } from "./CUTLINEComposition";
import type { CUTLINECompositionProps } from "./types";

const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;

const defaultProps: CUTLINECompositionProps = {
  script: { entries: [] },
  shotList: { shots: [], totalDurationSeconds: 30 },
  subtitleTrack: { chunks: [] },
  motionSpec: { entries: [] },
  visualSpec: { entries: [] },
  imageSpec: { entries: [] },
  audioBase64: null,
  logoUrl: undefined,
  logoPlacement: undefined,
};

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="CUTLINEComposition"
        component={CUTLINEComposition}
        durationInFrames={30 * FPS}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={defaultProps}
        calculateMetadata={({ props }) => {
          const durationSeconds =
            (typeof props.durationSeconds === "number" && props.durationSeconds > 0)
              ? props.durationSeconds
              : (props.shotList?.totalDurationSeconds ?? 30);
          const width = typeof props.width === "number" ? props.width : WIDTH;
          const height = typeof props.height === "number" ? props.height : HEIGHT;
          return {
            durationInFrames: Math.ceil(durationSeconds * FPS),
            fps: FPS,
            width,
            height,
          };
        }}
      />
    </>
  );
};
