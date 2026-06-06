import {readdir, readFile, stat} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {
  contentTypeForPath,
  getR2Config,
  headR2Object,
  isMediaFile,
  loadEnvFile,
  putR2Object
} from "../server/r2-media.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const concurrency = Number(process.env.R2_SYNC_CONCURRENCY || 6);

await loadEnvFile(path.join(root, ".env.local"));

const config = getR2Config();
const files = (await collectFiles(publicDir))
  .filter(({filePath}) => isMediaFile(filePath))
  .map(({filePath, size}) => ({
    filePath,
    key: path.relative(publicDir, filePath).replace(/\\/g, "/"),
    size
  }))
  .filter(({key}) => key.startsWith("assets/") || key.startsWith("images/"));

if (files.length === 0) {
  throw new Error("No media files found under public/assets or public/images.");
}

const totalBytes = files.reduce((total, file) => total + file.size, 0);
process.stdout.write(`Uploading ${files.length} media files (${formatBytes(totalBytes)}) to R2 bucket ${config.bucket}\n`);

await runPool(files, concurrency, async ({filePath, key, size}, index) => {
  const existing = await withRetries(() => headR2Object({config, key}));
  const remoteSize = existing.headers.get("content-length");

  if (!existing.ok || remoteSize !== String(size)) {
    const body = await readFile(filePath);
    const response = await withRetries(() =>
      putR2Object({
        body,
        config,
        contentType: contentTypeForPath(filePath),
        key
      })
    );

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText} while uploading ${key}: ${await response.text()}`);
    }
  }

  if ((index + 1) % 50 === 0 || index + 1 === files.length) {
    process.stdout.write(`Synced ${index + 1}/${files.length}\n`);
  }
});

process.stdout.write("Verifying uploaded objects\n");

await runPool(files, concurrency, async ({key, filePath}, index) => {
  const response = await withRetries(() => headR2Object({config, key}));

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} while verifying ${key}`);
  }

  const localSize = String((await stat(filePath)).size);
  const remoteSize = response.headers.get("content-length");

  if (remoteSize && remoteSize !== localSize) {
    throw new Error(`Size mismatch for ${key}: local ${localSize}, remote ${remoteSize}`);
  }

  if ((index + 1) % 250 === 0 || index + 1 === files.length) {
    process.stdout.write(`Verified ${index + 1}/${files.length}\n`);
  }
});

process.stdout.write("R2 media sync complete\n");

async function collectFiles(directory) {
  const entries = await readdir(directory, {withFileTypes: true});
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return collectFiles(fullPath);
      if (!entry.isFile()) return [];
      const {size} = await stat(fullPath);
      return [{filePath: fullPath, size}];
    })
  );

  return nested.flat();
}

async function runPool(items, limit, worker) {
  let next = 0;
  const failures = [];

  async function runWorker() {
    while (next < items.length) {
      const index = next;
      next += 1;

      try {
        await worker(items[index], index);
      } catch (error) {
        failures.push(error);
      }
    }
  }

  await Promise.all(Array.from({length: Math.min(limit, items.length)}, runWorker));

  if (failures.length > 0) {
    throw new Error(failures.map((error) => error.message).join("\n"));
  }
}

function formatBytes(value) {
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

async function withRetries(action, maxAttempts = 5) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await action();

      if (response.status < 500 || attempt === maxAttempts) {
        return response;
      }

      lastError = new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts) {
        throw error;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, attempt * 500));
  }

  throw lastError;
}
