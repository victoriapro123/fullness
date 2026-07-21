import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(root, "slides");
const htmlUrl = pathToFileURL(path.join(root, "index.html")).href;
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const slideCount = 12;

mkdirSync(outputDir, { recursive: true });

for (const entry of readdirSync(outputDir)) {
  if (/^manual-cecilia-\d{2}\.png$/i.test(entry)) {
    rmSync(path.join(outputDir, entry), { force: true });
  }
}

for (let slide = 1; slide <= slideCount; slide += 1) {
  const fileName = `manual-cecilia-${String(slide).padStart(2, "0")}.png`;
  const outputPath = path.join(outputDir, fileName);
  const result = spawnSync(
    chromePath,
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--hide-scrollbars",
      "--window-size=1600,900",
      `--screenshot=${outputPath}`,
      "--virtual-time-budget=1000",
      `${htmlUrl}?slide=${slide}`
    ],
    { encoding: "utf8" }
  );

  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout || `Failed exporting slide ${slide}\n`);
    process.exit(result.status || 1);
  }

  process.stdout.write(`Exported ${fileName}\n`);
}
