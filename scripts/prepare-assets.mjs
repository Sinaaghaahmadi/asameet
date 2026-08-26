// Prepares binary public assets at build time (prebuild hook):
// 1. copies Vazirmatn woff2 fonts from the npm package into public/fonts
// 2. generates PNG icons from public/logo.svg when they are missing
// Keeps the repo usable even without the committed binaries (e.g. file-based deploys).
import { copyFile, mkdir, access } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fontsDir = path.join(root, "public", "fonts");
const srcFonts = path.join(root, "node_modules", "vazirmatn", "fonts", "webfonts");

const WEIGHTS = ["Thin", "Light", "Regular", "Medium", "Bold", "Black"];

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

await mkdir(fontsDir, { recursive: true });
for (const w of WEIGHTS) {
  const name = `Vazirmatn-${w}.woff2`;
  if (!(await exists(path.join(fontsDir, name))) && (await exists(path.join(srcFonts, name)))) {
    await copyFile(path.join(srcFonts, name), path.join(fontsDir, name));
    console.log("[prepare-assets] copied", name);
  }
}

if (!(await exists(path.join(root, "public", "icons", "icon-512.png")))) {
  console.log("[prepare-assets] generating icons…");
  await import("./generate-icons.mjs");
} else {
  console.log("[prepare-assets] icons present, skipping generation");
}
