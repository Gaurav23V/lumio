import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_PORT = 1420;
const PORT_SCAN_LIMIT = 50;

function parseStartPort(rawValue) {
  const parsed = Number.parseInt(rawValue ?? `${DEFAULT_PORT}`, 10);
  if (Number.isNaN(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error("TAURI_DEV_SERVER_PORT must be a valid TCP port.");
  }
  return parsed;
}

function canBindPort(port, host) {
  return new Promise((resolve, reject) => {
    const server = createServer();

    server.once("error", (error) => {
      if (error && typeof error === "object" && "code" in error) {
        if (error.code === "EADDRINUSE") {
          resolve(false);
          return;
        }

        // Skip host families unavailable on the local machine.
        if (error.code === "EAFNOSUPPORT" || error.code === "EADDRNOTAVAIL") {
          resolve(true);
          return;
        }
      }

      reject(error);
    });

    server.listen(port, host, () => {
      server.close(() => resolve(true));
    });
  });
}

async function isPortAvailable(port) {
  const ipv4Available = await canBindPort(port, "127.0.0.1");
  if (!ipv4Available) {
    return false;
  }

  const ipv6Available = await canBindPort(port, "::1");
  if (!ipv6Available) {
    return false;
  }

  return true;
}

async function findAvailablePort(startPort) {
  for (let offset = 0; offset <= PORT_SCAN_LIMIT; offset += 1) {
    const port = startPort + offset;
    if (port > 65535) {
      break;
    }

    // Probe ports sequentially so we can keep Tauri and Vite aligned.
    if (await isPortAvailable(port)) {
      return port;
    }
  }

  throw new Error(
    `Unable to find an available port in range ${startPort}-${Math.min(
      startPort + PORT_SCAN_LIMIT,
      65535
    )}.`
  );
}

async function main() {
  const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
  const requestedPort = parseStartPort(process.env.TAURI_DEV_SERVER_PORT);
  const port = await findAvailablePort(requestedPort);

  if (port !== requestedPort) {
    console.warn(
      `[dev:tauri] Port ${requestedPort} is in use, starting desktop dev server on ${port}.`
    );
  }

  const beforeDevCommand = `pnpm exec vite --port ${port} --strictPort`;
  const tauriConfigOverride = JSON.stringify({
    build: {
      beforeDevCommand,
      devUrl: `http://localhost:${port}`
    }
  });

  const child = spawn(
    process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    ["exec", "tauri", "dev", "--config", tauriConfigOverride],
    {
      cwd: appRoot,
      stdio: "inherit",
      env: process.env
    }
  );

  child.on("error", (error) => {
    console.error("[dev:tauri] Failed to launch tauri dev.", error);
    process.exit(1);
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error("[dev:tauri] Failed to prepare development server.", error);
  process.exit(1);
});
