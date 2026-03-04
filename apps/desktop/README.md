# Desktop App (`apps/desktop`)

Tauri desktop shell for Lumio (Linux and Windows target).

## Contents

| Path | Purpose |
|---|---|
| `src/` | Desktop webview React entry |
| `src-tauri/` | Rust host, plugin setup, capabilities |
| `vite.config.ts` | Frontend build/dev config |
| `vitest.config.ts` | Desktop JS test configuration |

## Commands

- `pnpm --filter @lumio/desktop dev`
- `pnpm --filter @lumio/desktop dev:tauri`
- `pnpm --filter @lumio/desktop tauri:build`
- `pnpm --filter @lumio/desktop test`

## Native Plugins

- File System
- HTTP
- Opener
- SQL (SQLite)
- Stronghold (secure secrets)

## Notes

- Desktop provides offline metadata/cache behavior and background sync hooks.
- Ensure Tauri prerequisites are installed before running `dev:tauri`.
