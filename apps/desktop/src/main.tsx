import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { createCacheManager } from "./shell";

function App() {
  useEffect(() => {
    createCacheManager()
      .ensureCacheDir()
      .catch(() => {});
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>Lumio Desktop</h1>
      <p>
        Tauri shell: tokenVault, cacheManager, syncWorker from <code>./shell</code>.
      </p>
      <p style={{ fontSize: 12, color: "#666" }}>
        Shell: tokenVault, cacheManager, syncWorker. Sync starts when cloud/local configured.
      </p>
    </main>
  );
}

const container = document.getElementById("root");
if (!container) {
  throw new Error("Unable to find root element");
}

createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
