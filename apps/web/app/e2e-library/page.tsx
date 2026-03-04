"use client";

/**
 * E2E-only route: renders LibraryView with mock data.
 * Used by Playwright smoke tests to verify library UI without auth.
 * Not linked from the main app.
 */
import { LibraryView } from "@lumio/ui/library";

export default function E2ELibraryPage() {
  return (
    <main style={{ padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <h1>Lumio</h1>
      <LibraryView
        folders={[]}
        books={[]}
        onOpenBook={() => {}}
        onMoveBook={() => {}}
        onCreateFolder={() => {}}
        onRenameFolder={() => {}}
        onDeleteFolder={() => {}}
        onDeleteBook={() => {}}
        onUploadFiles={() => {}}
      />
    </main>
  );
}
