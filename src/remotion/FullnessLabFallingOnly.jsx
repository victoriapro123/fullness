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

const SOURCE_WIDTH = 1024;
const SOURCE_HEIGHT = 1536;
const asset = (name) => staticFile(`assets/fullness/${name}`);
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeFall = Easing.bezier(0.24, 0, 0.16, 1);

const vegetableSprites = [
  {
    src: "falling-png/esparragos.png",
    crop: {x: 225, y: 55, w: 360, h: 500},
    start: 0,
    end: 174,
    x: [470, 250, 185],
    y: [-210, 560, 1380],
    rotate: [-24, -48, -70],
    width: 190,
    opacity: 0.88,
    z: 28
  },
  {
    src: "falling-png/esparragos.png",
    crop: {x: 420, y: 190, w: 300, h: 500},
    start: 6,
    end: 182,
    x: [610, 760, 825],
    y: [-230, 620, 1400],
    rotate: [24, 44, 64],
    width: 162,
    opacity: 0.86,
    z: 29
  },
  {
    src: "falling-png/esparragos.png",
    crop: {x: 185, y: 760, w: 360, h: 520},
    start: 18,
    end: 188,
    x: [530, 360, 265],
    y: [-160, 720, 1500],
    rotate: [-18, -34, -54],
    width: 185,
    opacity: 0.82,
    z: 27
  },
  {
    src: "falling-png/esparragos.png",
    crop: {x: 620, y: 1140, w: 270, h: 330},
    start: 24,
    end: 188,
    x: [640, 735, 790],
    y: [-100, 700, 1460],
    rotate: [38, 20, 42],
    width: 155,
    opacity: 0.8,
    z: 27
  },
  {
    src: "falling-png/esparragos.png",
    crop: {x: 470, y: 530, w: 230, h: 240},
    start: 10,
    end: 172,
    x: [520, 690, 610],
    y: [-120, 620, 1340],
    rotate: [16, -12, 22],
    width: 130,
    opacity: 0.8,
    z: 31
  },
  {
    src: "falling-png/camote.png",
    crop: {x: 570, y: 92, w: 275, h: 280},
    start: 18,
    end: 176,
    x: [590, 835, 870],
    y: [-190, 600, 1375],
    rotate: [10, 46, 74],
    width: 130,
    opacity: 0.92,
    z: 34
  },
  {
    src: "falling-png/camote.png",
    crop: {x: 220, y: 300, w: 310, h: 330},
    start: 24,
    end: 184,
    x: [510, 295, 250],
    y: [-120, 670, 1430],
    rotate: [-18, -54, -86],
    width: 148,
    opacity: 0.9,
    z: 33
  },
  {
    src: "falling-png/camote.png",
    crop: {x: 480, y: 600, w: 300, h: 315},
    start: 36,
    end: 190,
    x: [590, 610, 485],
    y: [-80, 760, 1510],
    rotate: [12, -28, -48],
    width: 130,
    opacity: 0.86,
    z: 32
  },
  {
    src: "falling-png/camote.png",
    crop: {x: 210, y: 900, w: 300, h: 300},
    start: 44,
    end: 192,
    x: [470, 320, 365],
    y: [-40, 820, 1580],
    rotate: [-10, 28, 54],
    width: 126,
    opacity: 0.86,
    z: 32
  },
  {
    src: "falling-png/betarraga.png",
    crop: {x: 580, y: 110, w: 350, h: 310},
    start: 28,
    end: 180,
    x: [565, 720, 740],
    y: [-180, 570, 1350],
    rotate: [12, 116, 210],
    width: 172,
    opacity: 0.88,
    z: 30
  },
  {
    src: "falling-png/betarraga.png",
    crop: {x: 210, y: 325, w: 380, h: 335},
    start: 34,
    end: 186,
    x: [490, 250, 205],
    y: [-90, 690, 1450],
    rotate: [-6, -112, -210],
    width: 190,
    opacity: 0.9,
    z: 30
  },
  {
    src: "falling-png/betarraga.png",
    crop: {x: 545, y: 610, w: 360, h: 315},
    start: 44,
    end: 194,
    x: [600, 780, 690],
    y: [-40, 780, 1540],
    rotate: [20, 132, 248],
    width: 176,
    opacity: 0.86,
    z: 30
  }
];

const quinoaGrains = Array.from({length: 190}, (_, index) => ({
  start: index % 52,
  duration: 132 + (index % 38),
  x: 505 + ((index * 47) % 190) - 95,
  endX: 540 + ((index * 83) % 560) - 280,
  y: -120 - ((index * 19) % 260),
  endY: 1260 + ((index * 29) % 360),
  size: 2.2 + (index % 5) * 0.85,
  opacity: 0.45 + (index % 6) * 0.08
}));

const sparks = Array.from({length: 86}, (_, index) => ({
  x: 55 + ((index * 71) % 960),
  y: 70 + ((index * 131) % 1690),
  size: 1.2 + (index % 4) * 0.7,
  delay: index % 50
}));

const steam = Array.from({length: 12}, (_, index) => ({
  x: 385 + index * 26 + (index % 3) * 22,
  y: 1040 - (index % 4) * 36,
  w: 84 + (index % 5) * 24,
  delay: index * 8
}));

const useStage = () => {
  const {width, height, fps} = useVideoConfig();
  const isDesktop = width > height;
  const scale = isDesktop ? 0.58 : 1;
  return {
    width,
    height,
    fps,
    isDesktop,
    scale,
    xOffset: isDesktop ? (width - 1080 * scale) / 2 : 0,
    yOffset: isDesktop ? -80 : 0
  };
};

const Background = () => {
  const frame = useCurrentFrame();
  const {isDesktop, fps} = useStage();
  const camera = spring({
    frame,
    fps,
    config: {damping: 116, stiffness: 42, mass: 0.9}
  });
  const zoom = interpolate(frame, [0, 210], [1.035, 1.08], clamp) + camera * 0.005;

  return (
    <AbsoluteFill>
      <Img
        src={asset("fondo-oscuro.png")}
        style={{
          position: "absolute",
          inset: isDesktop ? "-18%" : "-5%",
          width: isDesktop ? "136%" : "110%",
          height: isDesktop ? "136%" : "110%",
          objectFit: "cover",
          opacity: 0.9,
          filter: "brightness(0.4) saturate(1.18) contrast(1.14)",
          transform: `scale(${zoom})`
        }}
      />
      <Img
        src={asset("continuation/01-se-abre-la-bolsa.png")}
        style={{
          position: "absolute",
          left: "50%",
          top: isDesktop ? "-8%" : "-8%",
          width: isDesktop ? "42%" : "76%",
          transform: "translateX(-50%) scale(1.02)",
          opacity: interpolate(frame, [0, 28, 72], [0.28, 0.16, 0], clamp),
          filter: "blur(10px) brightness(0.62) saturate(0.9)",
          mixBlendMode: "screen"
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 14% 7%, rgba(219,132,43,0.38), transparent 24%), radial-gradient(ellipse at 50% 48%, rgba(196,122,51,0.12), transparent 34%), linear-gradient(90deg, rgba(0,0,0,0.28), transparent 38%, rgba(0,0,0,0.58))"
        }}
      />
    </AbsoluteFill>
  );
};

const FallingSprite = ({item}) => {
  const frame = useCurrentFrame();
  const {scale, xOffset, yOffset} = useStage();
  const progress = interpolate(frame, [item.start, item.end], [0, 1], {...clamp, easing: easeFall});
  const appear = interpolate(frame, [item.start, item.start + 18], [0, 1], {...clamp, easing: easeOut});
  const x = interpolate(progress, [0, 0.44, 1], item.x, clamp);
  const y = interpolate(progress, [0, 0.52, 1], item.y, clamp) - Math.sin(progress * Math.PI) * 80;
  const rotate = interpolate(progress, [0, 0.55, 1], item.rotate, clamp);
  const depth = interpolate(progress, [0, 1], [0.9, 1.08], clamp);
  const natural = 1 + Math.sin((frame - item.start) * 0.05) * 0.018;
  const cropScale = item.width / item.crop.w;
  const displayHeight = item.crop.h * cropScale;
  const mask = "radial-gradient(ellipse at 50% 50%, black 0%, black 58%, rgba(0,0,0,0.6) 68%, transparent 82%)";

  return (
    <div
      style={{
        position: "absolute",
        left: x * scale + xOffset,
        top: y * scale + yOffset,
        width: item.width * scale,
        height: displayHeight * scale,
        opacity: appear * item.opacity,
        overflow: "hidden",
        transform: `translate(-50%, -50%) rotate(${rotate}deg) scale(${depth * natural})`,
        filter: "drop-shadow(0 32px 42px rgba(0,0,0,0.55))",
        mixBlendMode: "screen",
        WebkitMaskImage: mask,
        maskImage: mask,
        zIndex: item.z
      }}
    >
      <Img
        src={asset(item.src)}
        style={{
          position: "absolute",
          left: -item.crop.x * cropScale * scale,
          top: -item.crop.y * cropScale * scale,
          width: SOURCE_WIDTH * cropScale * scale,
          height: SOURCE_HEIGHT * cropScale * scale,
          filter: "brightness(1.06) saturate(1.22) contrast(1.18)"
        }}
      />
    </div>
  );
};

const QuinoaField = () => {
  const frame = useCurrentFrame();
  const {scale, xOffset, yOffset} = useStage();

  return (
    <>
      {quinoaGrains.map((grain, index) => {
        const end = grain.start + grain.duration;
        const progress = interpolate(frame, [grain.start, end], [0, 1], {...clamp, easing: easeFall});
        const opacity = interpolate(frame, [grain.start, grain.start + 12, end - 18, end], [0, grain.opacity, grain.opacity, 0.32], clamp);
        const x = interpolate(progress, [0, 0.5, 1], [grain.x, (grain.x + grain.endX) / 2, grain.endX], clamp);
        const y = interpolate(progress, [0, 1], [grain.y, grain.endY], clamp);

        return (
          <i
            key={index}
            style={{
              position: "absolute",
              left: x * scale + xOffset,
              top: y * scale + yOffset,
              width: grain.size * scale,
              height: grain.size * scale,
              opacity,
              borderRadius: 999,
              background: index % 4 === 0 ? "#efc26e" : "#b88949",
              boxShadow: "0 0 11px rgba(235,181,86,0.62)",
              zIndex: 35
            }}
          />
        );
      })}
    </>
  );
};

const FallingSalmon = () => {
  const frame = useCurrentFrame();
  const {scale, xOffset, yOffset, fps} = useStage();
  const progress = interpolate(frame, [168, 210], [0, 1], {...clamp, easing: easeFall});
  const entrance = interpolate(frame, [162, 180], [0, 1], {...clamp, easing: easeOut});
  const hold = spring({
    frame: frame - 172,
    fps,
    config: {damping: 92, stiffness: 34, mass: 1.08}
  });
  const x = interpolate(progress, [0, 0.55, 1], [565, 535, 565], clamp);
  const y = interpolate(progress, [0, 0.55, 1], [-210, 210, 650], clamp) - Math.sin(progress * Math.PI) * 44;
  const rotate = interpolate(progress, [0, 0.55, 1], [-7, 1, 7], clamp);
  const salmonScale = interpolate(progress, [0, 1], [0.68, 0.78], clamp) + hold * 0.012;

  return (
    <Img
      src={asset("hero-salmon-crop.png")}
      style={{
        position: "absolute",
        left: x * scale + xOffset,
        top: y * scale + yOffset,
        width: 275 * scale,
        opacity: entrance,
        transform: `translate(-50%, -50%) rotate(${rotate}deg) scale(${salmonScale})`,
        filter: "saturate(1.08) contrast(1.08) drop-shadow(0 38px 46px rgba(0,0,0,0.58))",
        zIndex: 42
      }}
    />
  );
};

const Atmosphere = () => {
  const frame = useCurrentFrame();
  const {isDesktop, scale, xOffset, yOffset} = useStage();

  return (
    <>
      {steam.map((puff, index) => {
        const local = Math.max(0, frame - puff.delay);
        const rise = interpolate(local % 118, [0, 118], [0, -180], clamp);
        const opacity = interpolate(local % 118, [0, 24, 94, 118], [0, 0.32, 0.22, 0], clamp);

        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: puff.x * scale + xOffset,
              top: (puff.y + rise) * scale + yOffset,
              width: puff.w * scale,
              height: puff.w * 1.7 * scale,
              borderRadius: "50%",
              opacity,
              background: "radial-gradient(circle, rgba(239,209,170,0.34), rgba(239,209,170,0.05) 62%, transparent 74%)",
              filter: "blur(20px)",
              zIndex: 37
            }}
          />
        );
      })}
      {sparks.map((spark, index) => {
        const local = Math.max(0, frame - spark.delay);
        const drift = interpolate(local % 112, [0, 112], [0, -70], clamp);
        const opacity = interpolate(local % 112, [0, 22, 88, 112], [0, 0.62, 0.28, 0], clamp);

        return (
          <i
            key={index}
            style={{
              position: "absolute",
              left: isDesktop ? spark.x * 1.08 - 25 : spark.x,
              top: isDesktop ? spark.y * 0.62 + 28 + drift : spark.y + drift,
              width: spark.size,
              height: spark.size,
              opacity,
              borderRadius: 999,
              background: "#e9b865",
              boxShadow: "0 0 16px rgba(233,184,101,0.8)",
              zIndex: 45
            }}
          />
        );
      })}
    </>
  );
};

export const FullnessLabFallingOnly = () => {
  return (
    <AbsoluteFill style={{overflow: "hidden", background: "#020403"}}>
      <Background />
      <QuinoaField />
      {vegetableSprites.map((item, index) => (
        <FallingSprite key={`${item.src}-${index}`} item={item} />
      ))}
      <FallingSalmon />
      <Atmosphere />
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at 50% 76%, transparent 0%, transparent 50%, rgba(0,0,0,0.5) 100%)",
          zIndex: 80
        }}
      />
    </AbsoluteFill>
  );
};
