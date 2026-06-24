#!/usr/bin/env node
import ffmpeg from "@ffmpeg-installer/ffmpeg";
import dotenv from "dotenv";
import OpenAI from "openai";
import { createReadStream } from "node:fs";
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(projectRoot, ".env.local"), quiet: true });
dotenv.config({ path: path.join(projectRoot, ".env"), quiet: true });

const supportedAudioExtensions = new Set([".opus", ".ogg", ".oga", ".m4a", ".mp3", ".wav", ".webm"]);

const args = process.argv.slice(2);
const convertOnly = args.includes("--convert-only");
const help = args.includes("--help") || args.includes("-h");
const inputArg = args.find((arg) => !arg.startsWith("--"));
const outputArg = getOptionValue("--out");
const language = getOptionValue("--language") || "es";
const model = getOptionValue("--model") || process.env.OPENAI_TRANSCRIPTION_MODEL || "whisper-1";

if (help) {
  printHelp();
  process.exit(0);
}

const inputPath = inputArg ? path.resolve(projectRoot, inputArg) : await findDefaultWhatsAppExport();

if (!inputPath) {
  throw new Error("No encontre carpeta o archivo de WhatsApp. Pasa una ruta como argumento.");
}

const inputStats = await stat(inputPath);
const audioFiles = inputStats.isDirectory()
  ? await findAudioFiles(inputPath)
  : supportedAudioExtensions.has(path.extname(inputPath).toLowerCase())
    ? [inputPath]
    : [];

if (audioFiles.length === 0) {
  throw new Error(`No encontre audios .opus/.ogg/.m4a/.mp3/.wav en ${inputPath}`);
}

const outputDir = path.resolve(
  projectRoot,
  outputArg || path.join("transcripciones-wsp", safeName(path.basename(inputPath)))
);
const convertedDir = path.join(outputDir, "audio-convertido");
await mkdir(convertedDir, { recursive: true });

console.log(`Audios encontrados: ${audioFiles.length}`);
console.log(`Salida: ${path.relative(projectRoot, outputDir)}`);

const convertedFiles = [];
for (const audioFile of audioFiles) {
  const convertedFile = path.join(convertedDir, `${safeName(path.basename(audioFile, path.extname(audioFile)))}.mp3`);
  await convertToMp3(audioFile, convertedFile);
  convertedFiles.push({ source: audioFile, converted: convertedFile });
  console.log(`Convertido: ${path.relative(projectRoot, audioFile)}`);
}

if (convertOnly) {
  console.log("Conversion lista. Ejecuta sin --convert-only para transcribir.");
  process.exit(0);
}

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error("Falta OPENAI_API_KEY en .env.local o en el entorno. Los .opus ya quedaron convertidos a mp3.");
}

const openai = new OpenAI({ apiKey });
const transcriptParts = [];
const transcriptJson = [];

for (const item of convertedFiles) {
  console.log(`Transcribiendo: ${path.basename(item.source)}`);
  const transcription = await openai.audio.transcriptions.create({
    file: createReadStream(item.converted),
    model,
    language,
    response_format: "text"
  });
  const text = typeof transcription === "string" ? transcription.trim() : String(transcription || "").trim();
  transcriptParts.push(`## ${path.basename(item.source)}\n\n${text || "_Sin texto detectado._"}\n`);
  transcriptJson.push({
    source: path.relative(projectRoot, item.source),
    converted: path.relative(projectRoot, item.converted),
    text
  });
}

const markdown = [
  "# Transcripcion de audios WhatsApp",
  "",
  `Origen: ${path.relative(projectRoot, inputPath)}`,
  `Modelo: ${model}`,
  `Idioma: ${language}`,
  "",
  ...transcriptParts
].join("\n");

await writeFile(path.join(outputDir, "transcripcion.md"), markdown, "utf8");
await writeFile(path.join(outputDir, "transcripcion.json"), JSON.stringify(transcriptJson, null, 2), "utf8");

console.log(`Transcripcion lista: ${path.relative(projectRoot, path.join(outputDir, "transcripcion.md"))}`);

function getOptionValue(name) {
  const index = args.indexOf(name);
  if (index === -1) return "";
  return args[index + 1] || "";
}

async function findDefaultWhatsAppExport() {
  const entries = await readdir(projectRoot, { withFileTypes: true });
  const chatFolder = entries.find((entry) => entry.isDirectory() && entry.name.startsWith("WhatsApp Chat -"));
  return chatFolder ? path.join(projectRoot, chatFolder.name) : "";
}

async function findAudioFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return findAudioFiles(fullPath);
    return supportedAudioExtensions.has(path.extname(entry.name).toLowerCase()) ? [fullPath] : [];
  }));

  return files.flat().sort((a, b) => a.localeCompare(b, "es"));
}

async function convertToMp3(input, output) {
  await new Promise((resolve, reject) => {
    const child = spawn(ffmpeg.path, [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      input,
      "-vn",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-codec:a",
      "libmp3lame",
      "-b:a",
      "64k",
      output
    ]);

    let errorOutput = "";
    child.stderr.on("data", (chunk) => {
      errorOutput += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`ffmpeg fallo con ${path.basename(input)}:\n${errorOutput}`));
    });
  });
}

function safeName(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "whatsapp-audios";
}

function printHelp() {
  console.log(`Uso:
  npm run whatsapp:transcribe -- "WhatsApp Chat - Nombre"
  npm run whatsapp:convert-audio -- "WhatsApp Chat - Nombre"

Opciones:
  --out <carpeta>       Carpeta de salida. Default: transcripciones-wsp/<nombre>
  --language <codigo>   Idioma para transcripcion. Default: es
  --model <modelo>      Modelo de transcripcion. Default: whisper-1
  --convert-only        Solo convierte audios a mp3
`);
}
