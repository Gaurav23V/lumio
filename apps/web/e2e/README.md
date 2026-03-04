# Web E2E Tests

Playwright smoke tests for sign-in and library UI. Uses route interception and a dedicated `/e2e-library` route so tests run **without real secrets** in CI.

## Test Coverage

- **Sign-in page** (`/`): Route interception mocks Supabase auth to return null session; verifies sign-in UI.
- **Library UI** (`/e2e-library`): Dedicated route renders `LibraryView` with mock props; no auth required.

## Env Assumptions

- **CI / mock mode**: Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to any non-empty values (e.g. `https://placeholder.supabase.co` and `eyJ...`). The fixtures intercept requests to the configured URL.
- **Full e2e** (optional): With real Supabase credentials, you can run additional tests against live auth.

## Run

```bash
pnpm --filter @lumio/web test:e2e
```

Or from repo root:

```bash
pnpm test:e2e
```

## CI

E2E runs in CI with placeholder env vars. No Supabase or Google secrets required.
