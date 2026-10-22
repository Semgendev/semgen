import { useMemo } from "react";
import { AbsoluteFill, Composition, OffthreadVideo, type CalculateMetadataFunction } from "remotion";

import { CaptionLayer } from "../features/captions/remotion/captioned-video";
import {
  EXPORT_COMPOSITION_ID,
  EXPORT_FPS,
  exportCaptions,
  exportPropsSchema,
  sameShape,
  type ExportProps,
} from "../features/captions/remotion/export-props";

// The video rendered by the export: the project video with its captions, in the chosen format. When
// the format differs from the video's own shape, the video is either cut to fill the frame ("crop")
// or shown whole on a blurred, enlarged copy of itself ("blur"). The captions are laid out on the
// exported frame, like in the preview.
function ExportVideo(props: ExportProps) {
  const { style, pages, moves } = useMemo(() => exportCaptions(props), [props]);
  const fills = sameShape(props, props.source);
  const blur = !fills && props.fit === "blur";
  return (
    <AbsoluteFill>
      {/* each video in its own full-frame layer: stacked on top of each other, not one below the other */}
      {blur ? (
        <AbsoluteFill>
          <OffthreadVideo
            src={props.videoSrc}
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "blur(40px) brightness(0.7)",
              transform: "scale(1.15)",
            }}
          />
        </AbsoluteFill>
      ) : null}
      <AbsoluteFill>
        <OffthreadVideo
          src={props.videoSrc}
          style={{ width: "100%", height: "100%", objectFit: blur ? "contain" : "cover" }}
        />
      </AbsoluteFill>
      <CaptionLayer pages={pages} style={style} moves={moves} />
    </AbsoluteFill>
  );
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
