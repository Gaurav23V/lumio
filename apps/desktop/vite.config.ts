import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const workerSrc = require.resolve("pdfjs-dist/build/pdf.worker.min.mjs");
const publicDir = join(__dirname, "public");
const workerDest = join(publicDir, "pdf.worker.min.mjs");
const tauriDevServerPort = Number.parseInt(
  process.env.TAURI_DEV_SERVER_PORT ?? "1420",
  10
);

if (Number.isNaN(tauriDevServerPort)) {
  throw new Error("TAURI_DEV_SERVER_PORT must be a valid number.");
}

if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true });
}
copyFileSync(workerSrc, workerDest);

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: tauriDevServerPort,
    strictPort: true
  },
  envPrefix: ["VITE_", "TAURI_"]
});
