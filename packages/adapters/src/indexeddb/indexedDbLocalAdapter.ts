import type { DBSchema, IDBPDatabase } from "idb";
import { openDB } from "idb";
import type { LocalStateAdapter, QueueStorage } from "@lumio/core";
import type { Book, Folder, ProgressRecord, SyncOperation } from "@lumio/core";

type MetaEntry = { key: string; value: string | null };

interface LumioIndexedDbSchema extends DBSchema {
  folders: {
    key: string;
    value: Folder;
  };
  books: {
    key: string;
    value: Book;
  };
  progress: {
    key: string;
    value: ProgressRecord;
  };
  queue: {
    key: string;
    value: SyncOperation;
  };
  meta: {
    key: string;
    value: MetaEntry;
  };
}

export type IndexedDbLocalAdapterOptions = {
  dbName?: string;
  version?: number;
};

export class IndexedDbLocalAdapter implements LocalStateAdapter, QueueStorage {
  private readonly dbName: string;
  private readonly version: number;
  private dbPromise: Promise<IDBPDatabase<LumioIndexedDbSchema>> | null = null;

  constructor(options: IndexedDbLocalAdapterOptions = {}) {
    this.dbName = options.dbName ?? "lumio-local";
    this.version = options.version ?? 1;
  }

  private async db(): Promise<IDBPDatabase<LumioIndexedDbSchema>> {
    if (!this.dbPromise) {
      this.dbPromise = openDB<LumioIndexedDbSchema>(this.dbName, this.version, {
        upgrade: (database) => {
          if (!database.objectStoreNames.contains("folders")) {
            database.createObjectStore("folders");
          }
          if (!database.objectStoreNames.contains("books")) {
            database.createObjectStore("books");
          }
          if (!database.objectStoreNames.contains("progress")) {
            database.createObjectStore("progress");
          }
          if (!database.objectStoreNames.contains("queue")) {
            database.createObjectStore("queue");
          }
          if (!database.objectStoreNames.contains("meta")) {
            database.createObjectStore("meta");
          }
        }
      });
    }
    const db = await this.dbPromise;
    await db.put("meta", { key: "schemaVersion", value: String(this.version) }, "schemaVersion");
    return db;
  }

  async getSchemaVersion(): Promise<number> {
    const db = await this.db();
    const value = await db.get("meta", "schemaVersion");
    return Number.parseInt(value?.value ?? "0", 10);
  }

  async getFolders(): Promise<Folder[]> {
    const db = await this.db();
    return db.getAll("folders");
  }

  async getBooks(): Promise<Book[]> {
    const db = await this.db();
    return db.getAll("books");
  }

  async getProgress(): Promise<ProgressRecord[]> {
    const db = await this.db();
    return db.getAll("progress");
  }

  async upsertFolders(folders: Folder[]): Promise<void> {
    const db = await this.db();
    const tx = db.transaction("folders", "readwrite");
    for (const folder of folders) {
      await tx.store.put(folder, folder.folderId);
    }
    await tx.done;
  }

  async upsertBooks(books: Book[]): Promise<void> {
    const db = await this.db();
    const tx = db.transaction("books", "readwrite");
    for (const book of books) {
      await tx.store.put(book, book.bookId);
    }
    await tx.done;
  }

  async upsertProgress(progress: ProgressRecord[]): Promise<void> {
    const db = await this.db();
    const tx = db.transaction("progress", "readwrite");
    for (const item of progress) {
      await tx.store.put(item, item.bookId);
    }
    await tx.done;
  }

  async deleteBooks(bookIds: string[]): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(["books", "progress"], "readwrite");
    for (const bookId of bookIds) {
      await tx.objectStore("books").delete(bookId);
      await tx.objectStore("progress").delete(bookId);
    }
    await tx.done;
  }

  async getLastSyncCursor(): Promise<string | null> {
    const db = await this.db();
    const result = await db.get("meta", "lastSyncCursor");
    return result?.value ?? null;
  }

  async setLastSyncCursor(cursor: string): Promise<void> {
    const db = await this.db();
    await db.put("meta", { key: "lastSyncCursor", value: cursor }, "lastSyncCursor");
  }

  async load(): Promise<SyncOperation[]> {
    const db = await this.db();
    return db.getAll("queue");
  }

  async save(operations: SyncOperation[]): Promise<void> {
    const db = await this.db();
    const tx = db.transaction("queue", "readwrite");
    await tx.store.clear();
    for (const operation of operations) {
      await tx.store.put(operation, operation.operationId);
    }
    await tx.done;
  }
}
