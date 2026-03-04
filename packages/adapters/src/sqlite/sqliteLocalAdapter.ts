import type { LocalStateAdapter, QueueStorage } from "@lumio/core";
import { nowIsoString } from "@lumio/core";
import type { Book, Folder, ProgressRecord, SyncOperation } from "@lumio/core";

export type SqlExecutor = {
  execute(sql: string, bindValues?: unknown[]): Promise<unknown>;
  select<T = unknown>(sql: string, bindValues?: unknown[]): Promise<T[]>;
};

export type SqliteLocalAdapterOptions = {
  schemaVersion?: number;
};

const DEFAULT_SCHEMA_VERSION = 1;

function toJson(value: unknown): string {
  return JSON.stringify(value);
}

function fromJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

export class SqliteLocalAdapter implements LocalStateAdapter, QueueStorage {
  private readonly schemaVersion: number;
  private initialized = false;

  constructor(
    private readonly executor: SqlExecutor,
    options: SqliteLocalAdapterOptions = {}
  ) {
    this.schemaVersion = options.schemaVersion ?? DEFAULT_SCHEMA_VERSION;
  }

  async getSchemaVersion(): Promise<number> {
    await this.initialize();
    const rows = await this.executor.select<{ value: string }>(
      "SELECT value FROM meta WHERE key = $1",
      ["schema_version"]
    );
    return Number.parseInt(rows[0]?.value ?? "0", 10);
  }

  private async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.executor.execute(`
      CREATE TABLE IF NOT EXISTS folders_local (
        folder_id TEXT PRIMARY KEY,
        payload_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    await this.executor.execute(`
      CREATE TABLE IF NOT EXISTS books_local (
        book_id TEXT PRIMARY KEY,
        payload_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    await this.executor.execute(`
      CREATE TABLE IF NOT EXISTS progress_local (
        book_id TEXT PRIMARY KEY,
        payload_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    await this.executor.execute(`
      CREATE TABLE IF NOT EXISTS queue_ops (
        operation_id TEXT PRIMARY KEY,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
    await this.executor.execute(`
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);

    await this.executor.execute(
      "INSERT INTO meta (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      ["schema_version", String(this.schemaVersion)]
    );

    this.initialized = true;
  }

  async getFolders(): Promise<Folder[]> {
    await this.initialize();
    const rows = await this.executor.select<{ payload_json: string }>(
      "SELECT payload_json FROM folders_local"
    );
    return rows.map((row) => fromJson<Folder>(row.payload_json));
  }

  async getBooks(): Promise<Book[]> {
    await this.initialize();
    const rows = await this.executor.select<{ payload_json: string }>("SELECT payload_json FROM books_local");
    return rows.map((row) => fromJson<Book>(row.payload_json));
  }

  async getProgress(): Promise<ProgressRecord[]> {
    await this.initialize();
    const rows = await this.executor.select<{ payload_json: string }>(
      "SELECT payload_json FROM progress_local"
    );
    return rows.map((row) => fromJson<ProgressRecord>(row.payload_json));
  }

  async upsertFolders(folders: Folder[]): Promise<void> {
    await this.initialize();
    for (const folder of folders) {
      await this.executor.execute(
        "INSERT INTO folders_local (folder_id, payload_json, updated_at) VALUES ($1, $2, $3) ON CONFLICT(folder_id) DO UPDATE SET payload_json = excluded.payload_json, updated_at = excluded.updated_at",
        [folder.folderId, toJson(folder), folder.updatedAt]
      );
    }
  }

  async upsertBooks(books: Book[]): Promise<void> {
    await this.initialize();
    for (const book of books) {
      await this.executor.execute(
        "INSERT INTO books_local (book_id, payload_json, updated_at) VALUES ($1, $2, $3) ON CONFLICT(book_id) DO UPDATE SET payload_json = excluded.payload_json, updated_at = excluded.updated_at",
        [book.bookId, toJson(book), book.updatedAt]
      );
    }
  }

  async upsertProgress(progress: ProgressRecord[]): Promise<void> {
    await this.initialize();
    for (const item of progress) {
      await this.executor.execute(
        "INSERT INTO progress_local (book_id, payload_json, updated_at) VALUES ($1, $2, $3) ON CONFLICT(book_id) DO UPDATE SET payload_json = excluded.payload_json, updated_at = excluded.updated_at",
        [item.bookId, toJson(item), item.updatedAt]
      );
    }
  }

  async deleteBooks(bookIds: string[]): Promise<void> {
    await this.initialize();
    for (const bookId of bookIds) {
      await this.executor.execute("DELETE FROM books_local WHERE book_id = $1", [bookId]);
      await this.executor.execute("DELETE FROM progress_local WHERE book_id = $1", [bookId]);
    }
  }

  async getLastSyncCursor(): Promise<string | null> {
    await this.initialize();
    const rows = await this.executor.select<{ value: string | null }>(
      "SELECT value FROM meta WHERE key = $1",
      ["last_sync_cursor"]
    );
    return rows[0]?.value ?? null;
  }

  async setLastSyncCursor(cursor: string): Promise<void> {
    await this.initialize();
    await this.executor.execute(
      "INSERT INTO meta (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      ["last_sync_cursor", cursor]
    );
  }

  async load(): Promise<SyncOperation[]> {
    await this.initialize();
    const rows = await this.executor.select<{ payload_json: string }>(
      "SELECT payload_json FROM queue_ops ORDER BY created_at ASC"
    );
    return rows.map((row) => fromJson<SyncOperation>(row.payload_json));
  }

  async save(operations: SyncOperation[]): Promise<void> {
    await this.initialize();
    await this.executor.execute("DELETE FROM queue_ops");
    for (const operation of operations) {
      await this.executor.execute(
        "INSERT INTO queue_ops (operation_id, payload_json, created_at) VALUES ($1, $2, $3)",
        [operation.operationId, toJson(operation), operation.createdAt]
      );
    }
    await this.executor.execute(
      "INSERT INTO meta (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      ["queue_last_saved_at", nowIsoString()]
    );
  }
}
