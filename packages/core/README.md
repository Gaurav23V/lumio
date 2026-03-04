# Core Package (`packages/core`)

Shared domain and sync logic used by web and desktop shells.

## Contents

| Path | Purpose |
|---|---|
| `src/` | Domain models, sync engine, queue logic, tests |
| `tsconfig.json` | Build and type settings |
| `vitest.config.ts` | Unit/integration test config |

## Responsibilities

- Define canonical models and validation
- Implement deterministic conflict resolution
- Provide offline queue behavior
- Define adapter interfaces for cloud/local integrations

## Commands

- `pnpm --filter @lumio/core build`
- `pnpm --filter @lumio/core test`
