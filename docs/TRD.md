# Lumio - Technical Requirements Document

## 0. Purpose

This document defines implementation requirements for Lumio web + desktop shells, shared logic/UI, cloud/local storage, and sync semantics.

## 1. Scope

### In Scope (V1)

- Google Sign-In
- PDF/EPUB library with folder organization
- Reader with progress persistence
- Google Drive file storage
- Supabase metadata/progress storage
- Desktop offline-first mode with cache + background sync

### Out of Scope (V1)

- DRM support
- Collaboration/social features
- Mobile apps
- Marketplace/payments
- AI summarization
- Highlights/notes (explicitly excluded for this V1)

## 2. Architecture

### Layers

1. Shared Core (`packages/core`)
   - domain models + validation
   - sync state machine
   - queue and conflict policies
2. Shared UI (`packages/ui`)
   - library and reader UI primitives
3. Platform shells
   - `apps/web` (Next.js)
   - `apps/desktop` (Tauri)

### Data Ownership

- Files: Google Drive
- Cloud metadata/progress: Supabase Postgres
- Desktop local metadata/progress: SQLite
- Web local metadata/progress: IndexedDB
- Desktop file cache: filesystem

## 3. Repository Layout

```text
apps/
  web/
  desktop/
packages/
  core/
  ui/
  adapters/
infra/
  supabase/
docs/
  PRD.md
  TRD.md
  ARCHITECTURE.md
```

## 4. Auth + Authorization

### Google

- OAuth for user identity and Drive access
- Prefer `drive.file` scope (least privilege)

### Supabase

- Supabase Auth session used for API/DB access
- DB access restricted by RLS to authenticated user rows

## 5. Drive Data Layout

```text
/Lumio
  /books
  /covers   (optional)
  /exports  (future)
```

Identity is never filename-based.  
Use stable `book_id` for internal references.

## 6. Core Data Model

- `book_id`, `folder_id`, `user_id` (UUID)
- `books`: metadata + Drive identifiers
- `folders`: name/order/deletion state
- `progress`: typed payload (`PDF`, `EPUB`), version, timestamps
- local sync status and cache status fields

## 7. Cloud Schema (Supabase)

Required tables:
- `folders`
- `books`
- `progress`
- `sync_events` (recommended)

Required:
- RLS enabled
- policies scoped by `auth.uid()`
- indexes on policy/filter columns (e.g. `user_id`, timestamps)

## 8. Local Schemas

### Desktop (SQLite)

- local mirrors: books/folders/progress
- durable operation queues
- cache entries table

### Web (IndexedDB)

- metadata/progress mirror
- optional file blob cache

## 9. Sync Design

### Direction

- metadata/progress: bi-directional
- files: upload on import, download on-demand

### Triggers

- app start
- post-login
- book open
- periodic timer
- app close (best effort)

### Conflict Resolution

- deterministic LWW by `version`, tie-break `device_id`

### Queue

Durable local queue supports:
- import
- progress updates
- folder moves
- delete
- upload/download file operations

Queue requirements:
- persistence
- retry with backoff
- progress dedupe by `book_id`

## 10. Import + Upload

### Desktop

- create local record immediately (`LOCAL_ONLY`)
- open reader immediately from local file
- enqueue background upload and metadata sync

### Web

- upload to Drive (resumable for large files)
- write metadata to Supabase
- begin reading as early as possible

## 11. Reader Engines

- PDF: `pdfjs-dist`
- EPUB: `epub.js`
- progress mapping:
  - PDF: page + scroll ratio
  - EPUB: CFI locator

## 12. Desktop Integration

- Tauri plugins:
  - SQL
  - FS
  - HTTP
  - Opener
  - Stronghold
- secure token storage on desktop
- local cache manager and background worker

## 13. Security

- no raw book content on Lumio-managed servers
- least privilege Drive access
- token secrecy and no sensitive logging
- RLS enforced for all user-owned tables

## 14. Observability

- per-book sync state
- local and cloud sync logs
- UI states for uploading/syncing/offline/error

## 15. Performance Targets

- library load < 500ms after local DB ready
- open cached book < 1s
- non-blocking progress writes
- background upload must not freeze UI

## 16. Development and CI

- `pnpm --filter @lumio/web dev`
- `pnpm --filter @lumio/desktop dev:tauri`
- CI gates:
  - lint
  - typecheck
  - tests
  - build

## 17. Milestones

1. Local-first desktop reader
2. Web reader + Drive uploads
3. Supabase metadata sync
4. Offline queue/cache + desktop background sync
5. Packaging + install scripts

## 18. Locked Decisions for This V1

- Highlights/notes excluded
- Real Google Drive + Supabase adapters included from first implementation pass
