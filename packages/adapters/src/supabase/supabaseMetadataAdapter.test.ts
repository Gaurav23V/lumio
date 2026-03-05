import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseMetadataAdapter } from "./supabaseMetadataAdapter";
import type { Database } from "./database.types";

type TableName = keyof Database["public"]["Tables"];

type QueryResponse = {
  data: unknown[] | null;
  error: { message: string } | null;
};

class FakeQueryBuilder implements PromiseLike<QueryResponse> {
  private operation: "read" | "upsert" | "update" = "read";
  private filters: Array<{ type: "eq" | "gt" | "in"; column: string; value: unknown }> = [];
  private updatePayload: Record<string, unknown> | null = null;
  private upsertPayload: unknown[] | null = null;

  constructor(
    private readonly tableName: TableName,
    private readonly context: FakeSupabaseClient
  ) {}

  select(): this {
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push({ type: "eq", column, value });
    return this;
  }

  gt(column: string, value: unknown): this {
    this.filters.push({ type: "gt", column, value });
    return this;
  }

  in(column: string, value: unknown): this {
    this.filters.push({ type: "in", column, value });
    return this;
  }

  order(): this {
    return this;
  }

  upsert(rows: unknown[]): this {
    this.operation = "upsert";
    this.upsertPayload = rows;
    this.context.upserts.push({ table: this.tableName, rows });
    return this;
  }

  update(payload: Record<string, unknown>): this {
    this.operation = "update";
    this.updatePayload = payload;
    this.context.updates.push({ table: this.tableName, payload });
    return this;
  }

  then<TResult1 = QueryResponse, TResult2 = never>(
    onfulfilled?: ((value: QueryResponse) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    const result = this.execute();
    return Promise.resolve(result).then(onfulfilled, onrejected);
  }

  private execute(): QueryResponse {
    if (this.operation === "upsert") {
      return { data: this.upsertPayload, error: null };
    }
    if (this.operation === "update") {
      return { data: [this.updatePayload], error: null };
    }
    if (this.context.failNextReads > 0) {
      this.context.failNextReads -= 1;
      throw new Error("TypeError: Failed to fetch");
    }

    const sourceRows = this.context.tables[this.tableName];
    const filtered = sourceRows.filter((row) => {
      for (const filter of this.filters) {
        const value = (row as Record<string, unknown>)[filter.column];
        if (filter.type === "eq" && value !== filter.value) {
          return false;
        }
        if (filter.type === "gt" && String(value) <= String(filter.value)) {
          return false;
        }
        if (filter.type === "in") {
          const filterValues = filter.value as string[];
          if (!Array.isArray(filterValues) || !filterValues.includes(String(value))) {
            return false;
          }
        }
      }
      return true;
    });
    return { data: filtered, error: null };
  }
}

class FakeSupabaseClient {
  tables: Record<TableName, Record<string, unknown>[]> = {
    folders: [],
    books: [],
    progress: []
  };
  upserts: Array<{ table: TableName; rows: unknown[] }> = [];
  updates: Array<{ table: TableName; payload: Record<string, unknown> }> = [];
  failNextReads = 0;

  from(tableName: TableName): FakeQueryBuilder {
    return new FakeQueryBuilder(tableName, this);
  }
}

function createFakeClient(): FakeSupabaseClient {
  const client = new FakeSupabaseClient();
  client.tables.folders = [
    {
      folder_id: "018f4fca-56a0-7b8a-9eea-1258356b2401",
      user_id: "018f4fca-56a0-7b8a-9eea-1258356b2402",
      name: "Research",
      sort_order: 1,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null
    }
  ];
  client.tables.books = [
    {
      book_id: "018f4fca-56a0-7b8a-9eea-1258356b2403",
      user_id: "018f4fca-56a0-7b8a-9eea-1258356b2402",
      folder_id: null,
      title: "Distributed Systems",
      author: "Tanenbaum",
      original_filename: "dist-sys.pdf",
      file_type: "PDF",
      file_size_bytes: 2048,
      content_hash: "hash-1",
      cover_ref: null,
      drive_file_id: "drive-id",
      drive_md5: null,
      sync_status: "SYNCED",
      cache_status: "NOT_CACHED",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:01:00.000Z",
      deleted_at: null
    }
  ];
  client.tables.progress = [
    {
      book_id: "018f4fca-56a0-7b8a-9eea-1258356b2403",
      user_id: "018f4fca-56a0-7b8a-9eea-1258356b2402",
      progress_type: "PDF",
      payload_json: { pageNumber: 11, scrollRatio: 0.2, zoom: 1.0 },
      version: 3,
      last_read_at: "2026-01-01T00:02:00.000Z",
      device_id: "device-a",
      updated_at: "2026-01-01T00:02:00.000Z"
    }
  ];
  return client;
}

describe("SupabaseMetadataAdapter", () => {
  it("pulls and maps cloud changes", async () => {
    const client = createFakeClient();
    const adapter = new SupabaseMetadataAdapter(
      client as unknown as SupabaseClient<Database>,
      "018f4fca-56a0-7b8a-9eea-1258356b2402"
    );
    const changes = await adapter.pullChanges(null);

    expect(changes.folders).toHaveLength(1);
    expect(changes.books).toHaveLength(1);
    expect(changes.progress).toHaveLength(1);
    expect(changes.nextCursor).toBe("2026-01-01T00:02:00.000Z");
  });

  it("upserts books and soft-deletes by id", async () => {
    const client = createFakeClient();
    const adapter = new SupabaseMetadataAdapter(
      client as unknown as SupabaseClient<Database>,
      "018f4fca-56a0-7b8a-9eea-1258356b2402"
    );

    await adapter.pushBooks([
      {
        bookId: "018f4fca-56a0-7b8a-9eea-1258356b2499",
        userId: "018f4fca-56a0-7b8a-9eea-1258356b2402",
        folderId: null,
        title: "New Book",
        author: null,
        originalFilename: "new.pdf",
        fileType: "PDF",
        fileSizeBytes: 33,
        contentHash: "hash-new",
        coverRef: null,
        driveFileId: "drive-new",
        driveMd5: null,
        syncStatus: "SYNCED",
        cacheStatus: "NOT_CACHED",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        deletedAt: null
      }
    ]);

    await adapter.deleteBooks(["018f4fca-56a0-7b8a-9eea-1258356b2499"]);

    expect(client.upserts.some((item) => item.table === "books")).toBe(true);
    expect(client.updates.some((item) => item.table === "books")).toBe(true);
  });

  it("retries transient fetch failures for pullChanges", async () => {
    const client = createFakeClient();
    client.failNextReads = 2;
    const adapter = new SupabaseMetadataAdapter(
      client as unknown as SupabaseClient<Database>,
      "018f4fca-56a0-7b8a-9eea-1258356b2402"
    );

    const changes = await adapter.pullChanges(null);
    expect(changes.folders).toHaveLength(1);
    expect(changes.books).toHaveLength(1);
    expect(changes.progress).toHaveLength(1);
  });
});
