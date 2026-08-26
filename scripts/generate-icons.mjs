// Generates PWA/app icons from public/logo.svg using sharp.
import sharp from "sharp";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

const root = path.resolve(import.meta.dirname, "..");
const pub = path.join(root, "public");
const iconsDir = path.join(pub, "icons");

const maskableSvg = (mark) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2dd4bf"/>
      <stop offset="0.55" stop-color="#0d9488"/>
      <stop offset="1" stop-color="#0f766e"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#g)"/>
  <g transform="translate(256 256) scale(0.72) translate(-256 -256)">${mark}</g>
</svg>`;

const mark = `
  <path d="M256 158 L352 342 H302 L256 246 L210 342 H160 Z" fill="#ffffff"/>
  <circle cx="256" cy="118" r="22" fill="#ffffff"/>
  <path d="M128 48 H384 Q464 48 464 128 V304 Q464 384 384 384 H240 L152 462 Q140 472 140 452 V384 H128 Q48 384 48 304 V128 Q48 48 128 48 Z" fill="none" stroke="#ffffff" stroke-width="26"/>
`;

async function main() {
  await mkdir(iconsDir, { recursive: true });
  const logo = await readFile(path.join(pub, "logo.svg"));

  const outputs = [
    { file: "icon-512.png", size: 512, src: logo },
    { file: "icon-192.png", size: 192, src: logo },
    { file: "apple-touch-icon.png", size: 180, src: logo },
    { file: "favicon-32.png", size: 32, src: logo },
    { file: "icon-maskable-512.png", size: 512, src: Buffer.from(maskableSvg(mark)) },
    { file: "icon-maskable-192.png", size: 192, src: Buffer.from(maskableSvg(mark)) },
  ];

  for (const { file, size, src } of outputs) {
    await sharp(src, { density: 300 }).resize(size, size).png().toFile(path.join(iconsDir, file));
    console.log("generated", file);
  }

  // logo.png at repo-documented path
  await sharp(logo, { density: 300 }).resize(512, 512).png().toFile(path.join(pub, "logo.png"));
  console.log("generated logo.png");

  // og image 1200x630
  const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#042f2e"/>
        <stop offset="1" stop-color="#134e4a"/>
      </linearGradient>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#2dd4bf"/>
        <stop offset="1" stop-color="#0f766e"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)"/>
    <circle cx="1050" cy="80" r="220" fill="#14b8a6" opacity="0.12"/>
    <circle cx="120" cy="560" r="180" fill="#2dd4bf" opacity="0.10"/>
    <g transform="translate(480 90) scale(0.55)">
      <path d="M128 48 H384 Q464 48 464 128 V304 Q464 384 384 384 H240 L152 462 Q140 472 140 452 V384 H128 Q48 384 48 304 V128 Q48 48 128 48 Z" fill="url(#g)"/>
      <path d="M256 158 L352 342 H302 L256 246 L210 342 H160 Z" fill="#ffffff"/>
      <circle cx="256" cy="118" r="22" fill="#ffffff"/>
    </g>
    <text x="600" y="440" text-anchor="middle" font-family="sans-serif" font-size="64" font-weight="700" fill="#f0fdfa">Asameet</text>
    <text x="600" y="510" text-anchor="middle" font-family="sans-serif" font-size="30" fill="#99f6e4">The Intelligent Conversation Platform</text>
  </svg>`;
  await sharp(Buffer.from(og), { density: 150 }).png().toFile(path.join(pub, "og-image.png"));
  console.log("generated og-image.png");

  await writeFile(path.join(pub, "favicon.svg"), await readFile(path.join(pub, "logo.svg")));
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
