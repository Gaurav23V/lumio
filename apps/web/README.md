# Web App (`apps/web`)

Next.js web shell for Lumio.

## Contents

| Path | Purpose |
|---|---|
| `app/` | App Router routes/layouts |
| `tests/` | Unit/integration/e2e-adjacent tests |
| `next.config.mjs` | Next.js config |
| `vitest.config.ts` | Web test configuration |

## Commands

- `pnpm --filter @lumio/web dev`
- `pnpm --filter @lumio/web build`
- `pnpm --filter @lumio/web test`
- `pnpm --filter @lumio/web test:e2e`

## Notes

- Web uses shared packages from `packages/core`, `packages/adapters`, and `packages/ui`.
- Auth and sync routes are implemented progressively with V1 milestones.
