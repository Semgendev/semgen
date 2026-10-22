import { useMemo } from "react";
import { Composition, type CalculateMetadataFunction } from "remotion";

import { CaptionedVideo } from "../features/captions/remotion/captioned-video";
import {
  EXPORT_COMPOSITION_ID,
  EXPORT_FPS,
  exportCaptions,
  exportPropsSchema,
  type ExportProps,
} from "../features/captions/remotion/export-props";

// The video rendered by the export: the project video with its captions, at its own size and length.
function ExportVideo(props: ExportProps) {
  const { style, pages, moves } = useMemo(() => exportCaptions(props), [props]);
  return <CaptionedVideo videoSrc={props.videoSrc} pages={pages} style={style} moves={moves} />;
}

const calculateMetadata: CalculateMetadataFunction<ExportProps> = ({ props }) => {
  const checked = exportPropsSchema.parse(props);
  return {
    props: checked,
    fps: EXPORT_FPS,
    width: checked.width,
    height: checked.height,
    durationInFrames: Math.max(1, Math.ceil(checked.durationS * EXPORT_FPS)),
  };
};

export function RemotionRoot() {
  return (
    <Composition
      id={EXPORT_COMPOSITION_ID}
      component={ExportVideo}
      calculateMetadata={calculateMetadata}
      // replaced by calculateMetadata from the real video
      fps={EXPORT_FPS}
      width={1080}
      height={1920}
      durationInFrames={1}
      defaultProps={{
        videoSrc: "",
        words: [],
        captionStyle: null,
        width: 1080,
        height: 1920,
        durationS: 1,
      }}
    />
  );
}
