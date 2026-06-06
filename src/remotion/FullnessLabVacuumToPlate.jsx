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

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeInOut = Easing.bezier(0.45, 0, 0.55, 1);
const asset = (name) => staticFile(`assets/fullness/${name}`);

const keyframes = [
  {src: "continuation/01-se-abre-la-bolsa.png", start: 0, end: 92, y: -40, zoom: [1.02, 1.08]},
  {src: "continuation/02-caen-al-plato.png", start: 70, end: 164, y: -20, zoom: [1.02, 1.08]},
  {src: "continuation/03-va-cayendo-el-salmon.png", start: 142, end: 226, y: -12, zoom: [1.01, 1.06]},
  {src: "continuation/04-casi-cae-el-salmon.png", start: 206, end: 286, y: -8, zoom: [1.01, 1.05]},
  {src: "continuation/05-plato-listo.png", start: 266, end: 330, y: -4, zoom: [1, 1.025]}
];

const floaters = [
  {src: "kale.png", start: 62, end: 178, from: [430, -120], to: [390, 1180], width: 230, rotate: [-28, 18], z: 24},
  {src: "kale.png", start: 80, end: 188, from: [680, -80], to: [680, 1140], width: 170, rotate: [24, -18], z: 24},
  {src: "betarraga.png", start: 74, end: 178, from: [650, -140], to: [700, 1220], width: 165, rotate: [-30, 210], z: 25},
  {src: "betarraga.png", start: 112, end: 218, from: [440, -120], to: [435, 1300], width: 150, rotate: [18, 190], z: 25},
  {src: "camote.png", start: 76, end: 186, from: [380, -80], to: [360, 1360], width: 118, rotate: [-10, 55], z: 26},
  {src: "camote.png", start: 105, end: 212, from: [725, -70], to: [745, 1280], width: 108, rotate: [28, -34], z: 26},
  {src: "esparragos.png", start: 84, end: 202, from: [430, -220], to: [440, 1250], width: 135, rotate: [-38, -16], z: 27},
  {src: "esparragos.png", start: 100, end: 218, from: [680, -220], to: [665, 1220], width: 118, rotate: [32, -24], z: 27}
];

const quinoa = Array.from({length: 96}, (_, index) => ({
  start: 54 + (index % 22),
  x: 420 + ((index * 37) % 240),
  drift: -76 + ((index * 23) % 152),
  endY: 1310 + ((index * 29) % 190),
  size: 3 + (index % 4),
  delay: index % 16
}));

const sparks = Array.from({length: 72}, (_, index) => ({
  x: 70 + ((index * 61) % 930),
  y: 80 + ((index * 113) % 1660),
  size: 1.5 + (index % 4) * 0.7,
  delay: index % 40
}));

const steam = Array.from({length: 12}, (_, index) => ({
  x: 420 + index * 22 + (index % 2) * 28,
  y: 1260 - (index % 3) * 18,
  w: 90 + (index % 4) * 22,
  delay: index * 8
}));

const useCoverPlacement = () => {
  const {width, height, fps} = useVideoConfig();
  const isDesktop = width > height;
  return {width, height, fps, isDesktop};
};

const KeyframeLayer = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps, isDesktop} = useCoverPlacement();
  const fadeIn = scene.start === 0
    ? 1
    : interpolate(frame, [scene.start, scene.start + 24], [0, 1], {...clamp, easing: easeOut});
  const fadeOut = interpolate(frame, [scene.end - 24, scene.end], [1, 0], {...clamp, easing: easeInOut});
  const opacity = Math.min(fadeIn, fadeOut);
  const progress = interpolate(frame, [scene.start, scene.end], [0, 1], clamp);
  const cameraEase = spring({
    frame: frame - scene.start,
    fps,
    config: {
      damping: 120,
      stiffness: 48,
      mass: 0.85
    }
  });
  const zoom = interpolate(progress, [0, 1], scene.zoom, clamp) + cameraEase * 0.006;
  const y = interpolate(progress, [0, 1], [scene.y, scene.y - 26], clamp);

  return (
    <AbsoluteFill style={{opacity}}>
      <Img
        src={asset(scene.src)}
        style={{
          position: "absolute",
          inset: isDesktop ? "-12%" : "-4%",
          width: isDesktop ? "124%" : "108%",
          height: isDesktop ? "124%" : "108%",
          objectFit: "cover",
          filter: "blur(28px) brightness(0.45) saturate(1.1)",
          transform: `scale(${zoom + 0.08}) translateY(${y * 0.28}px)`
        }}
      />
      <Img
        src={asset(scene.src)}
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: isDesktop ? "100%" : "100%",
          height: isDesktop ? "auto" : "100%",
          maxHeight: isDesktop ? "116%" : "none",
          objectFit: "contain",
          transform: `translate(-50%, -50%) translateY(${y}px) scale(${zoom})`,
          filter: "saturate(1.04) contrast(1.03) drop-shadow(0 34px 78px rgba(0,0,0,0.5))"
        }}
      />
    </AbsoluteFill>
  );
};

const AnimatedIngredient = ({item}) => {
  const frame = useCurrentFrame();
  const {isDesktop} = useCoverPlacement();
  const local = interpolate(frame, [item.start, item.end], [0, 1], {...clamp, easing: easeInOut});
  const enter = interpolate(frame, [item.start, item.start + 18], [0, 1], clamp);
  const exit = interpolate(frame, [item.end - 18, item.end], [1, 0], clamp);
  const opacity = Math.min(enter, exit) * (isDesktop ? 0.35 : 0.42);
  const arc = Math.sin(local * Math.PI) * -90;
  const x = interpolate(local, [0, 1], [item.from[0], item.to[0]], clamp);
  const y = interpolate(local, [0, 1], [item.from[1], item.to[1]], clamp) + arc;
  const rotate = interpolate(local, [0, 1], item.rotate, clamp);
  const desktopScale = isDesktop ? 0.62 : 1;
  const xOffset = isDesktop ? 420 : 0;
  const yOffset = isDesktop ? -230 : 0;

  return (
    <Img
      src={asset(item.src)}
      style={{
        position: "absolute",
        left: x * desktopScale + xOffset,
        top: y * desktopScale + yOffset,
        width: item.width * desktopScale,
        opacity,
        transform: `translate(-50%, -50%) rotate(${rotate}deg) scale(${1 + Math.sin(local * Math.PI) * 0.05})`,
        filter: "saturate(1.08) contrast(1.04) drop-shadow(0 28px 34px rgba(0,0,0,0.48))",
        zIndex: item.z
      }}
    />
  );
};

const QuinoaRain = () => {
  const frame = useCurrentFrame();
  const {isDesktop} = useCoverPlacement();
  const desktopScale = isDesktop ? 0.62 : 1;
  const xOffset = isDesktop ? 420 : 0;
  const yOffset = isDesktop ? -230 : 0;

  return (
    <>
      {quinoa.map((grain, index) => {
        const end = 185 + grain.delay;
        const p = interpolate(frame, [grain.start, end], [0, 1], {...clamp, easing: easeInOut});
        const opacity = interpolate(frame, [grain.start, grain.start + 12, end - 18, end], [0, 0.78, 0.78, 0], clamp);
        const x = grain.x + grain.drift * Math.sin(p * Math.PI);
        const y = interpolate(p, [0, 1], [-80, grain.endY], clamp);
        return (
          <i
            key={index}
            style={{
              position: "absolute",
              left: x * desktopScale + xOffset,
              top: y * desktopScale + yOffset,
              width: grain.size * desktopScale,
              height: grain.size * desktopScale,
              opacity: opacity * (isDesktop ? 0.8 : 1),
              borderRadius: 999,
              background: index % 3 === 0 ? "#e0b66c" : "#a97a42",
              boxShadow: "0 0 10px rgba(230,180,94,0.55)",
              zIndex: 23
            }}
          />
        );
      })}
    </>
  );
};

const SalmonHero = () => {
  const frame = useCurrentFrame();
  const {isDesktop} = useCoverPlacement();
  const desktopScale = isDesktop ? 0.62 : 1;
  const xOffset = isDesktop ? 420 : 0;
  const yOffset = isDesktop ? -230 : 0;
  const p = interpolate(frame, [128, 178], [0, 1], {...clamp, easing: easeInOut});
  const hold = interpolate(frame, [148, 164], [0, 1], clamp);
  const opacity = interpolate(frame, [120, 140, 160, 180], [0, 0.32, 0.22, 0], clamp);
  const x = interpolate(p, [0, 0.52, 1], [540, 530, 542], clamp);
  const y = interpolate(p, [0, 0.48, 1], [320, 500, 690], clamp) - Math.sin(p * Math.PI) * 34;
  const rotate = interpolate(p, [0, 0.55, 1], [-6, 5, 18], clamp);
  const scale = interpolate(p, [0, 0.5, 1], [0.8, 0.87 + hold * 0.02, 0.9], clamp);

  return (
    <Img
      src={asset("hero-salmon-crop.png")}
      style={{
        position: "absolute",
        left: x * desktopScale + xOffset,
        top: y * desktopScale + yOffset,
        width: 310 * desktopScale,
        opacity,
        transform: `translate(-50%, -50%) rotate(${rotate}deg) scale(${scale})`,
        filter: "saturate(1.08) contrast(1.05) drop-shadow(0 34px 44px rgba(0,0,0,0.54))",
        zIndex: 34
      }}
    />
  );
};

const Atmosphere = () => {
  const frame = useCurrentFrame();
  const {isDesktop} = useCoverPlacement();
  const show = interpolate(frame, [0, 330], [1, 0.78], clamp);
  return (
    <>
      {sparks.map((spark, index) => {
        const local = Math.max(0, frame - spark.delay);
        const drift = interpolate(local % 120, [0, 120], [0, -70], clamp);
        const opacity = show * interpolate(local % 120, [0, 25, 95, 120], [0, 0.72, 0.36, 0], clamp);
        return (
          <i
            key={index}
            style={{
              position: "absolute",
              left: isDesktop ? spark.x * 1.1 - 40 : spark.x,
              top: isDesktop ? spark.y * 0.6 + 40 + drift : spark.y + drift,
              width: spark.size,
              height: spark.size,
              opacity,
              borderRadius: 999,
              background: "#e9b865",
              boxShadow: "0 0 16px rgba(233,184,101,0.8)",
              zIndex: 40
            }}
          />
        );
      })}
      {steam.map((puff, index) => {
        const local = Math.max(0, frame - 120 - puff.delay);
        const rise = interpolate(local % 130, [0, 130], [0, -210], clamp);
        const opacity = interpolate(frame, [120, 170, 315, 330], [0, 0.42, 0.34, 0], clamp) *
          interpolate(local % 130, [0, 25, 100, 130], [0, 1, 0.5, 0], clamp);
        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: isDesktop ? puff.x * 0.62 + 420 : puff.x,
              top: isDesktop ? (puff.y + rise) * 0.62 - 230 : puff.y + rise,
              width: isDesktop ? puff.w * 0.72 : puff.w,
              height: isDesktop ? puff.w * 1.18 : puff.w * 1.7,
              borderRadius: "50%",
              opacity,
              background: "radial-gradient(circle, rgba(242,220,185,0.44), rgba(242,220,185,0.04) 64%, transparent 74%)",
              filter: "blur(18px)",
              zIndex: 39
            }}
          />
        );
      })}
    </>
  );
};

export const FullnessLabVacuumToPlate = () => {
  return (
    <AbsoluteFill style={{overflow: "hidden", background: "#020403"}}>
      {keyframes.map((scene) => (
        <KeyframeLayer key={scene.src} scene={scene} />
      ))}
      <QuinoaRain />
      {floaters.map((item, index) => (
        <AnimatedIngredient key={`${item.src}-${index}`} item={item} />
      ))}
      <SalmonHero />
      <Atmosphere />
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at 50% 52%, transparent 0%, transparent 54%, rgba(0,0,0,0.48) 100%)",
          zIndex: 80
        }}
      />
    </AbsoluteFill>
  );
};
