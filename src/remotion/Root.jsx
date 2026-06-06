import React from "react";
import {Composition} from "remotion";
import {FullnessLabFallingOnly} from "./FullnessLabFallingOnly.jsx";
import {FullnessLabPlateAssembly} from "./FullnessLabPlateAssembly.jsx";
import {FullnessLabVacuumToPlate} from "./FullnessLabVacuumToPlate.jsx";

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="FullnessLabVacuumToPlateMobile"
        component={FullnessLabVacuumToPlate}
        durationInFrames={330}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="FullnessLabVacuumToPlateDesktop"
        component={FullnessLabVacuumToPlate}
        durationInFrames={330}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="FullnessLabFallingOnlyMobile"
        component={FullnessLabFallingOnly}
        durationInFrames={210}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="FullnessLabFallingOnlyDesktop"
        component={FullnessLabFallingOnly}
        durationInFrames={210}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="FullnessLabPlateAssemblyMobile"
        component={FullnessLabPlateAssembly}
        durationInFrames={210}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="FullnessLabPlateAssemblyDesktop"
        component={FullnessLabPlateAssembly}
        durationInFrames={210}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
