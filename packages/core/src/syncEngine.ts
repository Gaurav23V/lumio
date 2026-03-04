import type { CloudMetadataAdapter, LocalStateAdapter } from "./adapters";
import { resolveProgressConflict } from "./conflictResolver";
import type { OfflineQueue } from "./offlineQueue";
import { BookSchema, FolderSchema, ProgressSchema } from "./types";
import type { Book, Folder, ProgressRecord, SyncOperation } from "./types";

function compareUpdatedAt(a: { updatedAt: string }, b: { updatedAt: string }): number {
  const aMs = Date.parse(a.updatedAt);
  const bMs = Date.parse(b.updatedAt);
  if (aMs === bMs) {
    return 0;
  }
  return aMs > bMs ? 1 : -1;
}

function mergeEntitySets<T extends { updatedAt: string }>(
  local: T[],
  remote: T[],
  idSelector: (item: T) => string
): T[] {
  const byId = new Map<string, T>();
  for (const item of local) {
    byId.set(idSelector(item), item);
  }
  for (const item of remote) {
    const id = idSelector(item);
    const existing = byId.get(id);
    if (!existing) {
      byId.set(id, item);
      continue;
    }
    byId.set(id, compareUpdatedAt(existing, item) >= 0 ? existing : item);
  }
  return [...byId.values()];
}

function mergeProgress(local: ProgressRecord[], remote: ProgressRecord[]): ProgressRecord[] {
  const byId = new Map<string, ProgressRecord>();
  for (const item of local) {
    byId.set(item.bookId, item);
  }
  for (const item of remote) {
    const existing = byId.get(item.bookId);
    if (!existing) {
      byId.set(item.bookId, item);
      continue;
    }
    byId.set(item.bookId, resolveProgressConflict(existing, item));
  }
  return [...byId.values()];
}

export type SyncRunSummary = {
  pulled: {
    folders: number;
    books: number;
    progress: number;
  };
  queue: {
    processed: number;
    failed: number;
  };
  cursor: string;
};

export class SyncEngine {
  constructor(
    private readonly cloud: CloudMetadataAdapter,
    private readonly local: LocalStateAdapter,
    private readonly queue: OfflineQueue
  ) {}

  async runOnce(): Promise<SyncRunSummary> {
    const sinceCursor = await this.local.getLastSyncCursor();
    const pulled = await this.cloud.pullChanges(sinceCursor);

    const localFolders = await this.local.getFolders();
    const localBooks = await this.local.getBooks();
    const localProgress = await this.local.getProgress();

    const mergedFolders = mergeEntitySets(localFolders, pulled.folders, (item) => item.folderId);
    const mergedBooks = mergeEntitySets(localBooks, pulled.books, (item) => item.bookId);
    const mergedProgress = mergeProgress(localProgress, pulled.progress);

    await this.local.upsertFolders(mergedFolders);
    await this.local.upsertBooks(mergedBooks);
    await this.local.upsertProgress(mergedProgress);

    await this.queue.coalesceProgress();
    const runnable = await this.queue.getRunnable();
    let processed = 0;
    let failed = 0;

    for (const operation of runnable) {
      await this.queue.markProcessing(operation.operationId);
      try {
        await this.executeOperation(operation);
        await this.queue.markCompleted(operation.operationId);
        processed += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown queue processing error";
        await this.queue.markFailed(operation.operationId, message);
        failed += 1;
      }
    }

    await this.local.setLastSyncCursor(pulled.nextCursor);

    return {
      pulled: {
        folders: pulled.folders.length,
        books: pulled.books.length,
        progress: pulled.progress.length
      },
      queue: {
        processed,
        failed
      },
      cursor: pulled.nextCursor
    };
  }

  private async executeOperation(operation: SyncOperation): Promise<void> {
    switch (operation.operationType) {
      case "UPDATE_PROGRESS": {
        const progress = ProgressSchema.parse(operation.payload);
        await this.cloud.pushProgress([progress]);
        return;
      }
      case "MOVE_BOOK_FOLDER":
      case "IMPORT_BOOK": {
        const book = BookSchema.parse(operation.payload);
        await this.cloud.pushBooks([book]);
        return;
      }
      case "DELETE_BOOK": {
        const bookId = operation.payload.bookId;
        if (typeof bookId !== "string") {
          throw new Error("DELETE_BOOK payload missing bookId");
        }
        await this.cloud.deleteBooks([bookId]);
        return;
      }
      default: {
        // Upload/download operations are handled by platform workers.
        return;
      }
    }
  }
}

export function buildLocalMergePreview(
  local: { folders: Folder[]; books: Book[]; progress: ProgressRecord[] },
  pulled: { folders: Folder[]; books: Book[]; progress: ProgressRecord[] }
): {
  folders: Folder[];
  books: Book[];
  progress: ProgressRecord[];
} {
  return {
    folders: mergeEntitySets(local.folders, pulled.folders, (item) => item.folderId),
    books: mergeEntitySets(local.books, pulled.books, (item) => item.bookId),
    progress: mergeProgress(local.progress, pulled.progress)
  };
}

export function validateCloudPayload(input: {
  folders: Folder[];
  books: Book[];
  progress: ProgressRecord[];
}): void {
  input.folders.forEach((item) => FolderSchema.parse(item));
  input.books.forEach((item) => BookSchema.parse(item));
  input.progress.forEach((item) => ProgressSchema.parse(item));
}
