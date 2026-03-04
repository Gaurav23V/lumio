import { describe, expect, it } from "vitest";
import type { CloudMetadataAdapter, LocalStateAdapter } from "./adapters";
import { InMemoryQueueStorage, OfflineQueue } from "./offlineQueue";
import { SyncEngine } from "./syncEngine";
import type { Book, CloudChanges, Folder, ProgressRecord } from "./types";

class FakeLocalStateAdapter implements LocalStateAdapter {
  folders: Folder[] = [];
  books: Book[] = [];
  progress: ProgressRecord[] = [];
  cursor: string | null = null;

  async getFolders(): Promise<Folder[]> {
    return structuredClone(this.folders);
  }

  async getBooks(): Promise<Book[]> {
    return structuredClone(this.books);
  }

  async getProgress(): Promise<ProgressRecord[]> {
    return structuredClone(this.progress);
  }

  async upsertFolders(folders: Folder[]): Promise<void> {
    this.folders = structuredClone(folders);
  }

  async upsertBooks(books: Book[]): Promise<void> {
    this.books = structuredClone(books);
  }

  async upsertProgress(progress: ProgressRecord[]): Promise<void> {
    this.progress = structuredClone(progress);
  }

  async deleteBooks(bookIds: string[]): Promise<void> {
    this.books = this.books.filter((book) => !bookIds.includes(book.bookId));
  }

  async getLastSyncCursor(): Promise<string | null> {
    return this.cursor;
  }

  async setLastSyncCursor(cursor: string): Promise<void> {
    this.cursor = cursor;
  }
}

class FakeCloudMetadataAdapter implements CloudMetadataAdapter {
  pushedProgress: ProgressRecord[] = [];
  pushedBooks: Book[] = [];
  deletedBookIds: string[] = [];
  pulled: CloudChanges;

  constructor(pulled: CloudChanges) {
    this.pulled = pulled;
  }

  async pullChanges(sinceCursor: string | null): Promise<CloudChanges> {
    void sinceCursor;
    return structuredClone(this.pulled);
  }

  async pushFolders(folders: Folder[]): Promise<void> {
    void folders;
  }

  async pushBooks(books: Book[]): Promise<void> {
    this.pushedBooks.push(...books);
  }

  async pushProgress(progress: ProgressRecord[]): Promise<void> {
    this.pushedProgress.push(...progress);
  }

  async deleteBooks(bookIds: string[]): Promise<void> {
    this.deletedBookIds.push(...bookIds);
  }
}

function makeFolder(): Folder {
  return {
    folderId: "018f4fca-56a0-7b8a-9eea-1258356b2100",
    userId: "018f4fca-56a0-7b8a-9eea-1258356b2101",
    name: "Unsorted",
    sortOrder: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    deletedAt: null
  };
}

function makeBook(): Book {
  return {
    bookId: "018f4fca-56a0-7b8a-9eea-1258356b2102",
    userId: "018f4fca-56a0-7b8a-9eea-1258356b2101",
    folderId: null,
    title: "Book One",
    author: null,
    originalFilename: "book-one.pdf",
    fileType: "PDF",
    fileSizeBytes: 1024,
    contentHash: "hash-1",
    coverRef: null,
    driveFileId: "drive-1",
    driveMd5: null,
    syncStatus: "SYNCED",
    cacheStatus: "NOT_CACHED",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    deletedAt: null
  };
}

function makeProgress(): ProgressRecord {
  return {
    bookId: "018f4fca-56a0-7b8a-9eea-1258356b2102",
    userId: "018f4fca-56a0-7b8a-9eea-1258356b2101",
    progressType: "PDF",
    payload: { pageNumber: 10, scrollRatio: 0.3, zoom: 1.0 },
    version: 1,
    lastReadAt: "2026-01-01T00:00:00.000Z",
    deviceId: "device-a",
    updatedAt: "2026-01-01T00:00:00.000Z"
  };
}

describe("SyncEngine", () => {
  it("pulls cloud changes, merges locally, and pushes queued updates", async () => {
    const local = new FakeLocalStateAdapter();
    const cloud = new FakeCloudMetadataAdapter({
      folders: [makeFolder()],
      books: [makeBook()],
      progress: [makeProgress()],
      nextCursor: "cursor-001"
    });
    const queue = new OfflineQueue(new InMemoryQueueStorage());
    await queue.enqueue({
      operationId: "progress-op",
      operationType: "UPDATE_PROGRESS",
      payload: {
        ...makeProgress(),
        version: 2,
        updatedAt: "2026-01-01T00:01:00.000Z",
        lastReadAt: "2026-01-01T00:01:00.000Z"
      }
    });

    const engine = new SyncEngine(cloud, local, queue);
    const summary = await engine.runOnce();

    expect(summary.pulled.books).toBe(1);
    expect(summary.queue.processed).toBe(1);
    expect(summary.cursor).toBe("cursor-001");
    expect(local.books).toHaveLength(1);
    expect(local.progress).toHaveLength(1);
    expect(cloud.pushedProgress).toHaveLength(1);
    expect(local.cursor).toBe("cursor-001");
  });
});
