import { readdir, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve("public/assets/tarot");
const FACE_INPUT_DIR = "faces";
const FACE_OUTPUT_DIR = "faces-webp";
const FACE_WIDTH = Number(process.env.TAROT_WEBP_FACE_WIDTH ?? 720);
const BACK_WIDTH = Number(process.env.TAROT_WEBP_BACK_WIDTH ?? 720);
const QUALITY = Number(process.env.TAROT_WEBP_QUALITY ?? 78);

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg"]);

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function listDeckDirs() {
  const entries = await readdir(ROOT, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => path.join(ROOT, entry.name));
}

async function listFaceFiles(deckDir) {
  const facesDir = path.join(deckDir, FACE_INPUT_DIR);
  if (!(await exists(facesDir))) return [];

  const entries = await readdir(facesDir, { withFileTypes: true });
  return entries
    .filter((entry) => {
      if (!entry.isFile() || entry.name.startsWith(".") || entry.name.startsWith("._")) return false;
      if (entry.name.toLowerCase() === "back.png") return false;
      return IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase());
    })
    .map((entry) => path.join(facesDir, entry.name));
}

async function convertImage(inputPath, outputPath, width) {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await sharp(inputPath, { failOn: "none" })
    .rotate()
    .resize({
      width,
      withoutEnlargement: true
    })
    .webp({
      quality: QUALITY,
      effort: 5,
      smartSubsample: true
    })
    .toFile(outputPath);
}

async function main() {
  const decks = await listDeckDirs();
  let convertedFaces = 0;
  let convertedBacks = 0;

  for (const deckDir of decks) {
    const outputFacesDir = path.join(deckDir, FACE_OUTPUT_DIR);
    const faceFiles = await listFaceFiles(deckDir);

    for (const facePath of faceFiles) {
      const parsed = path.parse(facePath);
      const outputPath = path.join(outputFacesDir, `${parsed.name}.webp`);
      await convertImage(facePath, outputPath, FACE_WIDTH);
      convertedFaces += 1;
    }

    const backPath = path.join(deckDir, "back.png");
    if (await exists(backPath)) {
      await convertImage(backPath, path.join(deckDir, "back.webp"), BACK_WIDTH);
      convertedBacks += 1;
    }
  }

  console.log(
    `Generated tarot WebP assets: ${convertedFaces} faces, ${convertedBacks} backs, width=${FACE_WIDTH}, quality=${QUALITY}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
