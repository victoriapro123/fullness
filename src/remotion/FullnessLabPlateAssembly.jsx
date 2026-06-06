import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig
} from "remotion";

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
};

const asset = (name) => staticFile(`assets/fullness/${name}`);
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeInOut = Easing.bezier(0.45, 0, 0.55, 1);

const vegetablePlate = "exports/sequence-check-220.png";
const finalPlate = "exports/sequence-check-390.png";

const goldDust = Array.from({length: 120}, (_, index) => ({
  x: 360 + ((index * 53) % 370),
  y: 560 + ((index * 97) % 680),
  drift: -34 + ((index * 29) % 68),
  size: 1.3 + (index % 5) * 0.55,
  delay: index % 42,
  life: 88 + (index % 34)
}));

const settlingGrains = Array.from({length: 76}, (_, index) => ({
  start: index % 36,
  x: 330 + ((index * 71) % 430),
  endX: 250 + ((index * 109) % 560),
  y: 780 + ((index * 47) % 250),
  endY: 1120 + ((index * 37) % 150),
  size: 2 + (index % 6) * 0.85
}));

const steamPuffs = Array.from({length: 18}, (_, index) => ({
  x: 455 + (index % 5) * 34 + Math.floor(index / 5) * 10,
  y: 990 - (index % 4) * 18,
  w: 52 + (index % 6) * 18,
  delay: index * 6
}));

const useCanvas = () => {
  const {width, height, fps, durationInFrames} = useVideoConfig();
  const isDesktop = width > height;
  return {width, height, fps, durationInFrames, isDesktop};
};

const useStageTransform = () => {
  const {width, height, isDesktop} = useCanvas();
  const baseWidth = 960;
  const baseHeight = 540;
  const scale = Math.max(width / baseWidth, height / baseHeight);
  const offsetX = (width - baseWidth * scale) / 2;
  const offsetY = (height - baseHeight * scale) / 2;

  return {isDesktop, scale, offsetX, offsetY};
};

const KeyframeImage = ({src, opacity, y = 0, zoom = 1, zIndex = 1, filter}) => {
  return (
    <Img
      src={asset(src)}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        opacity,
        transform: `translateY(${y}px) scale(${zoom})`,
        filter:
          filter ??
          "saturate(1.05) contrast(1.06) drop-shadow(0 42px 92px rgba(0,0,0,0.62))",
        zIndex
      }}
    />
  );
};

const Background = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useCanvas();
  const zoom = interpolate(frame, [0, durationInFrames - 1], [1.08, 1.13], clamp);

  return (
    <AbsoluteFill>
      <KeyframeImage
        src={finalPlate}
        opacity={0.72}
        zoom={zoom}
        filter="blur(34px) brightness(0.34) saturate(1.08)"
        zIndex={0}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 12% 8%, rgba(225,131,35,0.42), transparent 24%), radial-gradient(ellipse at 50% 69%, rgba(213,143,62,0.16), transparent 38%), linear-gradient(90deg, rgba(0,0,0,0.24), transparent 38%, rgba(0,0,0,0.58))",
          zIndex: 1
        }}
      />
    </AbsoluteFill>
  );
};

const PlateKeyframes = () => {
  const frame = useCurrentFrame();
  const {durationInFrames, fps} = useCanvas();
  const settle = spring({
    frame,
    fps,
    config: {damping: 92, stiffness: 34, mass: 0.95}
  });
  const finalStart = durationInFrames - 7;
  const finalHold = durationInFrames - 3;
  const vegetableOpacity = interpolate(frame, [0, durationInFrames - 8, finalHold], [1, 1, 0], clamp);
  const finalOpacity = interpolate(
    frame,
    [finalStart, finalHold],
    [0, 1],
    {...clamp, easing: easeInOut}
  );
  const cameraZoom = interpolate(frame, [0, durationInFrames - 1], [1.0, 1.028], clamp);
  const cameraY = interpolate(frame, [0, durationInFrames - 1], [12, -6], clamp);
  const entryY = interpolate(settle, [0, 1], [26, 0], clamp);

  return (
    <>
      <KeyframeImage
        src={vegetablePlate}
        opacity={vegetableOpacity}
        y={cameraY + entryY}
        zoom={cameraZoom}
        zIndex={10}
      />
      <AnimatedSalmon />
      <KeyframeImage
        src={finalPlate}
        opacity={finalOpacity}
        y={interpolate(frame, [finalStart, durationInFrames - 1], [6, -8], clamp)}
        zoom={interpolate(frame, [finalStart, durationInFrames - 1], [1.006, 1.03], clamp)}
        zIndex={12}
      />
    </>
  );
};

const AnimatedSalmon = () => {
  const frame = useCurrentFrame();
  const {durationInFrames, fps} = useCanvas();
  const {scale, offsetX, offsetY} = useStageTransform();
  const salmonDelay = 45;
  const activeFrame = frame - salmonDelay;
  const fallStart = 0;
  const fallEnd = durationInFrames - salmonDelay - 18;
  const settle = spring({
    frame: activeFrame - (fallEnd - 18),
    fps,
    config: {damping: 88, stiffness: 44, mass: 0.9}
  });
  const p = interpolate(activeFrame, [fallStart, fallEnd], [0, 1], {...clamp, easing: easeInOut});
  const x = interpolate(p, [0, 0.32, 0.7, 1], [481, 486, 492, 497], clamp);
  const y = interpolate(p, [0, 0.26, 0.68, 1], [176, 224, 306, 382], clamp) - Math.sin(p * Math.PI) * 10;
  const rotate = interpolate(p, [0, 0.48, 0.78, 1], [-5, 4, 14, 22], clamp) - settle * 1.4;
  const width = interpolate(p, [0, 0.56, 1], [86, 98, 112], clamp);
  const finalSwitch = durationInFrames - 8;
  const opacity = interpolate(frame, [salmonDelay, salmonDelay + 10, finalSwitch, finalSwitch + 3], [0, 1, 1, 0], clamp);
  const shadow = interpolate(p, [0, 1], [0.56, 0.82], clamp);

  return (
    <Img
      src={asset("hero-salmon-crop.png")}
      style={{
        position: "absolute",
        left: offsetX + x * scale,
        top: offsetY + y * scale,
        width: width * scale,
        opacity,
        transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
        transformOrigin: "50% 54%",
        filter: `saturate(1.06) contrast(1.07) drop-shadow(0 ${30 * scale}px ${44 * scale}px rgba(0,0,0,${shadow}))`,
        zIndex: 48
      }}
    />
  );
};

const VegetableSettle = () => {
  const frame = useCurrentFrame();
  const {width, height, isDesktop} = useCanvas();
  const scaleX = width / 1080;
  const scaleY = height / 1920;
  const desktopScale = isDesktop ? height / 1080 : 1;
  const sideOffset = isDesktop ? (width - 1080 * desktopScale) / 2 : 0;

  return (
    <>
      {settlingGrains.map((grain, index) => {
        const progress = interpolate(
          frame,
          [grain.start, grain.start + 76],
          [0, 1],
          {...clamp, easing: easeOut}
        );
        const opacity = interpolate(
          frame,
          [grain.start, grain.start + 12, grain.start + 62, grain.start + 86],
          [0, 0.58, 0.48, 0],
          clamp
        );
        const x = interpolate(progress, [0, 1], [grain.x, grain.endX], clamp);
        const y = interpolate(progress, [0, 1], [grain.y, grain.endY], clamp);
        const arc = Math.sin(progress * Math.PI) * (36 + (index % 5) * 10);
        const left = isDesktop ? sideOffset + x * desktopScale : x * scaleX;
        const top = isDesktop ? (y - arc - 420) * desktopScale : (y - arc) * scaleY;

        return (
          <i
            key={index}
            style={{
              position: "absolute",
              left,
              top,
              width: grain.size * (isDesktop ? desktopScale : scaleX),
              height: grain.size * (isDesktop ? desktopScale : scaleX),
              opacity,
              borderRadius: 999,
              background: index % 4 === 0 ? "#efc876" : "#b8894d",
              boxShadow: "0 0 12px rgba(239,200,118,0.65)",
              zIndex: 35
            }}
          />
        );
      })}
    </>
  );
};

const Atmosphere = () => {
  const frame = useCurrentFrame();
  const {durationInFrames, width, height, isDesktop} = useCanvas();
  const scaleX = width / 1080;
  const scaleY = height / 1920;
  const desktopScale = isDesktop ? height / 1080 : 1;
  const sideOffset = isDesktop ? (width - 1080 * desktopScale) / 2 : 0;

  return (
    <>
      {steamPuffs.map((puff, index) => {
        const local = Math.max(0, frame - puff.delay);
        const cycle = local % 142;
        const rise = interpolate(cycle, [0, 142], [0, -250], clamp);
        const opacity =
          interpolate(frame, [0, 35, durationInFrames - 22, durationInFrames - 1], [0.08, 0.2, 0.28, 0.18], clamp) *
          interpolate(cycle, [0, 22, 112, 142], [0, 1, 0.42, 0], clamp);
        const left = isDesktop
          ? sideOffset + puff.x * desktopScale
          : puff.x * scaleX;
        const top = isDesktop
          ? (puff.y + rise - 420) * desktopScale
          : (puff.y + rise) * scaleY;

        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left,
              top,
              width: puff.w * (isDesktop ? desktopScale : scaleX),
              height: puff.w * 1.9 * (isDesktop ? desktopScale : scaleX),
              borderRadius: "50%",
              opacity,
              background:
                "radial-gradient(circle, rgba(239,208,172,0.25), rgba(239,208,172,0.05) 58%, transparent 74%)",
              filter: "blur(24px)",
              zIndex: 32
            }}
          />
        );
      })}
      {goldDust.map((spark, index) => {
        const local = Math.max(0, frame - spark.delay);
        const cycle = local % spark.life;
        const rise = interpolate(cycle, [0, spark.life], [18, -78], clamp);
        const opacity =
          interpolate(cycle, [0, 18, spark.life - 18, spark.life], [0, 0.62, 0.34, 0], clamp) *
          interpolate(frame, [0, durationInFrames - 20, durationInFrames - 1], [1, 1, 0.75], clamp);
        const shimmer = 0.75 + Math.sin((frame + index * 11) * 0.12) * 0.25;
        const left = isDesktop
          ? sideOffset + (spark.x + spark.drift * Math.sin(cycle * 0.03)) * desktopScale
          : (spark.x + spark.drift * Math.sin(cycle * 0.03)) * scaleX;
        const top = isDesktop ? (spark.y + rise - 420) * desktopScale : (spark.y + rise) * scaleY;

        return (
          <i
            key={index}
            style={{
              position: "absolute",
              left,
              top,
              width: spark.size * shimmer * (isDesktop ? desktopScale : scaleX),
              height: spark.size * shimmer * (isDesktop ? desktopScale : scaleX),
              opacity,
              borderRadius: 999,
              background: "#e8b35e",
              boxShadow: "0 0 15px rgba(232,179,94,0.82)",
              zIndex: 45
            }}
          />
        );
      })}
    </>
  );
};

export const FullnessLabPlateAssembly = () => {
  return (
    <AbsoluteFill style={{overflow: "hidden", background: "#020403"}}>
      <Background />
      <PlateKeyframes />
      <VegetableSettle />
      <Atmosphere />
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at 50% 72%, transparent 0%, transparent 56%, rgba(0,0,0,0.48) 100%)",
          zIndex: 90
        }}
      />
    </AbsoluteFill>
  );
};
