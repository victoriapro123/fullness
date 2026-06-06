import {bundle} from "@remotion/bundler";
import {getCompositions, openBrowser, renderStill} from "@remotion/renderer";
import {existsSync, mkdirSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const entryPoint = path.join(root, "src", "remotion", "index.jsx");
const frameJobs = [
  {
    compositionId: "FullnessLabVacuumToPlateMobile",
    outputDir: path.join(root, "public", "assets", "fullness", "frames", "mobile")
  },
  {
    compositionId: "FullnessLabVacuumToPlateDesktop",
    outputDir: path.join(root, "public", "assets", "fullness", "frames", "desktop")
  },
  {
    compositionId: "FullnessLabPlateAssemblyMobile",
    outputDir: path.join(root, "public", "assets", "fullness", "frames", "plate-mobile")
  },
  {
    compositionId: "FullnessLabPlateAssemblyDesktop",
    outputDir: path.join(root, "public", "assets", "fullness", "frames", "plate-desktop")
  }
];

for (const job of frameJobs) {
  mkdirSync(job.outputDir, {recursive: true});
}

const serveUrl = await bundle({
  entryPoint,
  publicDir: path.join(root, "public"),
  onProgress: (progress) => {
    const percent = Math.round(progress);
    if (percent % 25 === 0) {
      process.stdout.write(`Bundling ${percent}%\n`);
    }
  }
});

const compositions = await getCompositions(serveUrl);

const browser = await openBrowser("chrome");

try {
  for (const job of frameJobs) {
    const composition = compositions.find((item) => item.id === job.compositionId);

    if (!composition) {
      throw new Error(`Composition ${job.compositionId} was not found.`);
    }

    for (let frame = 0; frame < composition.durationInFrames; frame += 1) {
      const output = path.join(job.outputDir, `frame-${String(frame).padStart(4, "0")}.webp`);

      if (existsSync(output)) {
        const skipped = frame + 1;
        if (skipped % 30 === 0 || skipped === composition.durationInFrames) {
          process.stdout.write(`${job.compositionId}: skipped ${skipped}/${composition.durationInFrames}\n`);
        }
        continue;
      }

      await renderStill({
        serveUrl,
        composition,
        frame,
        imageFormat: "webp",
        output,
        puppeteerInstance: browser,
        overwrite: true
      });

      const rendered = frame + 1;
      if (rendered % 30 === 0 || rendered === composition.durationInFrames) {
        process.stdout.write(`${job.compositionId}: exported ${rendered}/${composition.durationInFrames}\n`);
      }
    }

    process.stdout.write(`Exported ${composition.durationInFrames} WebP frames to ${job.outputDir}\n`);
  }
} finally {
  await browser.close({silent: true});
}
