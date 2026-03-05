import { copyFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Copy pdfjs worker to public so it's served as a bundled asset (avoids CDN fetch failure)
const workerSrc = require.resolve("pdfjs-dist/build/pdf.worker.min.mjs");
const publicDir = join(__dirname, "public");
const workerDest = join(publicDir, "pdf.worker.min.mjs");
if (!existsSync(publicDir)) mkdirSync(publicDir, { recursive: true });
copyFileSync(workerSrc, workerDest);

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@lumio/core", "@lumio/adapters", "@lumio/ui"]
};

export default nextConfig;
