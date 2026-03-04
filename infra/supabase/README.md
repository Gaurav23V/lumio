# Supabase Infrastructure (`infra/supabase`)

Database schema, migrations, and RLS policy definitions for Lumio cloud metadata.

## Contents

| Path | Purpose |
|---|---|
| `migrations/` | Ordered SQL migrations |

## Planned Tables

- `books`
- `folders`
- `progress`
- `sync_events` (optional diagnostics)

## Security

- RLS enabled on all user-owned tables
- Policies scoped by authenticated user (`auth.uid()`)
- Indexes on policy/filter columns for performance

## Usage

Apply migrations using your Supabase workflow (CLI or dashboard SQL runner).  
Keep migration history append-only.
