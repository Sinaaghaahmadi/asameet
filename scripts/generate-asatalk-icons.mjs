// Generates Asatalk PWA icons + OG image from public/asatalk/icons/favicon.svg.
import sharp from "sharp";
import { mkdir, readFile } from "fs/promises";
import path from "path";

const root = path.resolve(import.meta.dirname, "..");
const dir = path.join(root, "public", "asatalk", "icons");
const svg = await readFile(path.join(dir, "favicon.svg"));

const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7cc4ff"/><stop offset="0.55" stop-color="#3b82f6"/><stop offset="1" stop-color="#1d4ed8"/></linearGradient></defs>
  <rect width="512" height="512" fill="url(#g)"/>
  <g transform="translate(256 256) scale(0.66) translate(-256 -256)">
    <path d="M150 352L256 140l106 212h-50l-56-118-56 118z" fill="#fff"/>
    <path d="M118 360l-22 60 74-48z" fill="#fff"/>
    <circle cx="256" cy="110" r="16" fill="#fff" fill-opacity="0.9"/>
  </g>
</svg>`;

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1e1b4b"/><stop offset="1" stop-color="#1d4ed8"/></linearGradient></defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <circle cx="1000" cy="120" r="220" fill="#60a5fa" fill-opacity="0.25"/>
  <circle cx="150" cy="560" r="180" fill="#a78bfa" fill-opacity="0.25"/>
  <g transform="translate(120 200) scale(0.45)">
    <circle cx="256" cy="256" r="232" fill="#3b82f6"/>
    <path d="M150 352L256 140l106 212h-50l-56-118-56 118z" fill="#fff"/>
    <path d="M118 360l-22 60 74-48z" fill="#fff"/>
  </g>
  <text x="400" y="290" font-family="sans-serif" font-size="110" font-weight="800" fill="#fff">Asatalk</text>
  <text x="400" y="370" font-family="sans-serif" font-size="40" fill="#dbeafe">Messaging &amp; calls — fast, glassy, friendly</text>
</svg>`;

await mkdir(dir, { recursive: true });
const outputs = [
  ["icon-512.png", 512, svg],
  ["icon-192.png", 192, svg],
  ["apple-touch-icon.png", 180, svg],
  ["favicon-32.png", 32, svg],
  ["icon-maskable-512.png", 512, Buffer.from(maskable)],
  ["icon-maskable-192.png", 192, Buffer.from(maskable)],
];
for (const [file, size, src] of outputs) {
  await sharp(src, { density: 300 }).resize(size, size).png().toFile(path.join(dir, file));
  console.log("generated", file);
}
await sharp(Buffer.from(og)).png().toFile(path.join(root, "public", "asatalk", "og.png"));
console.log("generated og.png");
