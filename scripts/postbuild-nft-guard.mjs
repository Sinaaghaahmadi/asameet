// Guard for the Vercel packaging step.
//
// On Next.js 16.3.x, Vercel's onBuildComplete packaging can fail with
//   ENOENT: no such file or directory, open '.next/next-server.js.nft.json'
// because the node-file-trace manifest is emitted under .next/cache/ instead
// of at the root of .next/. This copies it into the expected location when it
// is missing. It is a no-op on a healthy build and on static exports.
import { access, copyFile, readdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NAME = "next-server.js.nft.json";
const target = path.join(root, ".next", NAME);

const exists = async (p) => {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
};

// Static export produces no .next server output — nothing to guard.
if (!(await exists(path.join(root, ".next")))) process.exit(0);
if (await exists(target)) process.exit(0);

const candidates = [
  path.join(root, ".next", "cache", NAME),
  path.join(root, ".next", "server", NAME),
  path.join(root, ".next", "standalone", ".next", NAME),
];

// Last resort: shallow scan of .next/cache for the manifest.
try {
  for (const entry of await readdir(path.join(root, ".next", "cache"), { withFileTypes: true })) {
    if (entry.isDirectory()) candidates.push(path.join(root, ".next", "cache", entry.name, NAME));
  }
} catch {
  /* no cache dir */
}

for (const source of candidates) {
  if (await exists(source)) {
    await copyFile(source, target);
    console.log(`[nft-guard] restored ${NAME} from ${path.relative(root, source)}`);
    process.exit(0);
  }
}

console.log(`[nft-guard] ${NAME} not found at .next root and no copy located; leaving build as-is`);
