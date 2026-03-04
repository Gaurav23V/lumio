# Lumio

Cross-platform cloud-synced book reader for PDF and EPUB with:
- Web app (`Next.js`)
- Desktop app (`Tauri`, Linux/Windows)
- Shared TypeScript core, adapters, and React UI
- Google Drive for file storage
- Supabase Postgres for metadata/progress
- Offline-first desktop sync with local cache

## Quick Start

1. Install dependencies
   - `pnpm install`
2. Start the web app
   - `pnpm --filter @lumio/web dev`
3. Start desktop shell (requires Rust + Tauri prerequisites)
   - `pnpm --filter @lumio/desktop dev:tauri`
4. Run quality checks
   - `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

## Installation Commands (Release)

These are release-entry placeholders that will point to published installers. Local script placeholders live in `scripts/` (see `scripts/README.md`).

### Linux

```bash
curl -s https://install.bookreader.app/linux | bash
```

### Windows

```powershell
powershell -c "irm https://install.bookreader.app/windows | iex"
```

## Project Structure

```text
lumio/
├── apps/
│   ├── web/              # Next.js web shell
│   └── desktop/          # Tauri desktop shell
├── packages/
│   ├── core/             # Domain, sync engine, queue, conflict resolver
│   ├── adapters/         # Google Drive, Supabase, SQLite, IndexedDB adapters
│   └── ui/               # Shared React UI for library + reader
├── infra/
│   └── supabase/         # SQL migrations, policies, DB docs
├── scripts/              # Install/release script placeholders
├── docs/                 # PRD, TRD, architecture and operations docs
└── .github/workflows/    # CI
```

## Key Commands

- `pnpm dev` - run package/app dev commands in parallel
- `pnpm lint` - lint all workspace packages/apps
- `pnpm typecheck` - TypeScript validation for all projects
- `pnpm test` - unit/integration tests across workspace
- `pnpm build` - production builds for all projects
- `pnpm --filter @lumio/web test:e2e` - web e2e tests

## Environment Variables

See `DEVELOPMENT.md` for full setup. Core required variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side utilities only)

## Documentation

- `ARCHITECTURE.md` - system design and data flow
- `DEVELOPMENT.md` - local setup and development workflow
- `docs/PRD.md` - product requirements
- `docs/TRD.md` - technical requirements and implementation blueprint
- `docs/OPERATIONS.md` - sync troubleshooting and runbook

## Related Repositories

- [Workspace Root](../README.md) - full workspace catalog
