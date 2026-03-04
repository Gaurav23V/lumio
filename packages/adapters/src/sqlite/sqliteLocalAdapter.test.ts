import { describe, expect, it } from "vitest";
import { SqliteLocalAdapter } from "./sqliteLocalAdapter";

class MemorySqlExecutor {
  folders = new Map<string, { payload_json: string; updated_at: string }>();
  books = new Map<string, { payload_json: string; updated_at: string }>();
  progress = new Map<string, { payload_json: string; updated_at: string }>();
  queue = new Map<string, { payload_json: string; created_at: string }>();
  meta = new Map<string, string | null>();

  async execute(sql: string, bindValues: unknown[] = []): Promise<void> {
    const normalized = sql.trim().toLowerCase();

    if (normalized.startsWith("create table")) {
      return;
    }
    if (normalized.includes("insert into folders_local")) {
      const [id, payload, updatedAt] = bindValues as [string, string, string];
      this.folders.set(id, { payload_json: payload, updated_at: updatedAt });
      return;
    }
    if (normalized.includes("insert into books_local")) {
      const [id, payload, updatedAt] = bindValues as [string, string, string];
      this.books.set(id, { payload_json: payload, updated_at: updatedAt });
      return;
    }
    if (normalized.includes("insert into progress_local")) {
      const [id, payload, updatedAt] = bindValues as [string, string, string];
      this.progress.set(id, { payload_json: payload, updated_at: updatedAt });
      return;
    }
    if (normalized.startsWith("delete from books_local")) {
      const [id] = bindValues as [string];
      this.books.delete(id);
      return;
    }
    if (normalized.startsWith("delete from progress_local")) {
      const [id] = bindValues as [string];
      this.progress.delete(id);
      return;
    }
    if (normalized.startsWith("delete from queue_ops")) {
      this.queue.clear();
      return;
    }
    if (normalized.includes("insert into queue_ops")) {
      const [id, payload, createdAt] = bindValues as [string, string, string];
      this.queue.set(id, { payload_json: payload, created_at: createdAt });
      return;
    }
    if (normalized.includes("insert into meta")) {
      const [key, value] = bindValues as [string, string | null];
      this.meta.set(key, value);
      return;
    }
  }

  async select<T = unknown>(sql: string, bindValues: unknown[] = []): Promise<T[]> {
    const normalized = sql.trim().toLowerCase();
    if (normalized.startsWith("select payload_json from folders_local")) {
      return [...this.folders.values()] as T[];
    }
    if (normalized.startsWith("select payload_json from books_local")) {
      return [...this.books.values()] as T[];
    }
    if (normalized.startsWith("select payload_json from progress_local")) {
      return [...this.progress.values()] as T[];
    }
    if (normalized.startsWith("select payload_json from queue_ops")) {
      return [...this.queue.values()].sort((a, b) => a.created_at.localeCompare(b.created_at)) as T[];
    }
    if (normalized.startsWith("select value from meta where key = $1")) {
      const [key] = bindValues as [string];
      const value = this.meta.get(key) ?? null;
      return [{ value }] as T[];
    }
    return [];
  }
}

describe("SqliteLocalAdapter", () => {
  it("stores schema version metadata", async () => {
    const executor = new MemorySqlExecutor();
    const adapter = new SqliteLocalAdapter(executor, { schemaVersion: 4 });
    const schemaVersion = await adapter.getSchemaVersion();
    expect(schemaVersion).toBe(4);
  });

  it("persists and loads queue operations", async () => {
    const executor = new MemorySqlExecutor();
    const adapter = new SqliteLocalAdapter(executor);
    await adapter.save([
      {
        operationId: "op-1",
        operationType: "UPDATE_PROGRESS",
        payload: { bookId: "book-1", version: 1, deviceId: "d-1" },
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        attempts: 0,
        status: "PENDING",
        nextRetryAt: null,
        lastError: null
      }
    ]);
    const rows = await adapter.load();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.operationId).toBe("op-1");
  });
});
