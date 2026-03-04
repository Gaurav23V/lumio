# PRD - Cross-Platform Cloud-Synced Book Reader

## 1. Product Overview

Lumio is a cross-platform reader for PDF and EPUB on Linux desktop, Windows desktop, and web browser.  
Books are stored in user-owned Google Drive. The app syncs reading progress and library structure across devices.

Desktop apps must support offline reading and sync when connectivity returns.

## 2. Core Goals

1. Cross-device reading continuity
2. User-owned storage (Google Drive)
3. Offline-first desktop experience
4. Simple folder/category organization
5. Fast read/open performance

## 3. Supported Platforms

- Desktop: Linux, Windows
- Web: modern browser
- Out of scope (V1): mobile apps

## 4. Authentication

- Google Sign-In
- Permissions: profile + Drive access for app-managed files
- User identity is the Google account

## 5. Storage

- Primary file storage: Google Drive
- File types: `.pdf`, `.epub`
- App folder structure (logical):
  - `/BookReaderApp/books`
  - `/BookReaderApp/metadata`

## 6. Library Management

Users can:
- Upload/import files
- View and organize library
- Create/rename/delete folders
- Drag/drop books between folders
- Delete books

## 7. Upload Modes

- File picker upload
- Drag and drop
- Desktop local import

## 8. Reading Experience

- PDF rendering
- EPUB rendering
- Page/scroll navigation
- Zoom
- Search
- EPUB TOC navigation

## 9. Progress Sync

Tracked:
- current page
- scroll position
- last read timestamp

Behavior:
- On open, load latest cloud progress
- While reading, persist locally and sync periodically

## 10. Offline Mode (Desktop)

Available offline:
- Read cached books
- Track progress
- Queue sync updates

When online returns:
- Auto-sync queued updates

## 11. Local Caching

Desktop caches book files for:
- offline access
- faster reopen performance

Eviction may happen under storage limits.

## 12. Background Upload

After import:
1. Open immediately for reading
2. Upload in background

Large files should support chunked/resumable transfer.

## 13. Sync Surface

Synced between devices:
- books
- progress
- folder structure

Sync triggers:
- app start
- document open
- periodic intervals
- app close (best effort)

## 14. Web Behavior

Web supports reading/uploading/library management/progress sync.  
Offline behavior is best-effort based on browser capabilities.

## 15. Desktop Installation

README must include simple install commands for Linux and Windows.

## 16. Performance Goals

- Open book: < 1s target
- Resume position: instant
- Page change: < 100ms
- Library load: < 500ms

## 17. Security Principles

- Book content remains in user Drive
- No book file content stored on Lumio servers
- OAuth-based auth and least-privilege scopes

## 18. Future Features (Not V1)

- Highlights/annotations
- Dictionary and AI summary
- Export highlights
- Reading stats
- Mobile apps

## 19. Non-Goals (V1)

- Marketplace
- Social reading
- Multi-user shared libraries
- DRM support
- Mobile

## 20. Success Metrics

- App startup time
- Reader load time
- Sync reliability
- Resume accuracy across devices
- Offline reliability
