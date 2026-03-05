# Development Guide

## Prerequisites

- Node.js 20+ (22 recommended)
- `pnpm` 10+
- Rust toolchain (`rustup`) for desktop builds
- Tauri system dependencies for your OS
- Supabase project (or local Supabase CLI stack)
- Google Cloud OAuth client + Drive API enabled

## Setup

1. Install dependencies:
   - `pnpm install`
2. Create local env files:
   - `apps/web/.env.local`
   - `apps/desktop/.env.local` (if needed for desktop-side config)
3. Apply Supabase migrations (project-specific command in `infra/supabase`)
4. Configure Google OAuth redirect URIs and scopes:
   - Use least privilege (`https://www.googleapis.com/auth/drive.file`)

## Required Environment Variables

### Web (`apps/web/.env.local`)

- `NEXT_PUBLIC_SUPABASE_URL=...`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID=...`

### Optional / Server Utilities

- `SUPABASE_SERVICE_ROLE_KEY=...`
- `GOOGLE_CLIENT_SECRET=...`

Do not expose service role keys to browser code.

## Scripts

Install and release script placeholders are in `scripts/` (see `scripts/README.md`). Use for packaging and distribution when releases are published.

## Common Commands

- `pnpm dev` - run all dev tasks that are configured
- `pnpm --filter @lumio/web dev` - run web shell only
- `pnpm --filter @lumio/desktop dev:tauri` - run desktop shell
- `pnpm lint` - lint all workspace projects
- `pnpm typecheck` - TypeScript checks
- `pnpm test` - unit/integration suites
- `pnpm build` - production builds

## Testing Strategy

- Core unit tests validate sync, queue, and conflict rules
- Adapter tests validate cloud/local interface behavior
- Web e2e tests cover upload/read/resume and folder organization
- Desktop integration tests validate cache and offline queue behavior

## CI Expectations

All PRs should pass:
- lint
- typecheck
- test
- build

## Troubleshooting

- If browser auth loops, verify redirect URIs and site URL settings.
- If Drive upload fails with 4xx in resumable mode, restart the upload session.
- If Supabase queries return empty unexpectedly, verify RLS policies and auth session.

**Debugging upload/reader errors:** See [docs/OPERATIONS.md](docs/OPERATIONS.md#debugging-web-upload-and-reader-errors) for where to inspect logs (browser console/network, Supabase logs, Google Cloud).
