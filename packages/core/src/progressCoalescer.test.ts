import { describe, expect, it } from "vitest";
import { coalesceProgressOperations } from "./progressCoalescer";
import type { SyncOperation } from "./types";

function makeOperation(overrides: Partial<SyncOperation>): SyncOperation {
  return {
    operationId: crypto.randomUUID(),
    operationType: "UPDATE_PROGRESS",
    payload: {
      bookId: "018f4fca-56a0-7b8a-9eea-1258356b2010",
      version: 1,
      deviceId: "device-a"
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    attempts: 0,
    status: "PENDING",
    nextRetryAt: null,
    lastError: null,
    ...overrides
  };
}

describe("coalesceProgressOperations", () => {
  it("keeps only the newest progress operation per book", () => {
    const older = makeOperation({
      operationId: "op-1",
      payload: { bookId: "book-1", version: 2, deviceId: "a" },
      updatedAt: "2026-01-01T00:00:00.000Z"
    });
    const newer = makeOperation({
      operationId: "op-2",
      payload: { bookId: "book-1", version: 3, deviceId: "a" },
      updatedAt: "2026-01-01T00:01:00.000Z"
    });
    const other = makeOperation({
      operationId: "op-3",
      payload: { bookId: "book-2", version: 1, deviceId: "b" },
      updatedAt: "2026-01-01T00:00:30.000Z"
    });

    const result = coalesceProgressOperations([older, newer, other]);
    expect(result).toHaveLength(2);
    expect(result.map((item) => item.operationId)).toContain("op-2");
    expect(result.map((item) => item.operationId)).toContain("op-3");
  });

  it("keeps non-progress operations untouched", () => {
    const move = makeOperation({
      operationId: "move-op",
      operationType: "MOVE_BOOK_FOLDER",
      payload: { bookId: "book-1", folderId: "folder-1" }
    });
    const progress = makeOperation({
      operationId: "progress-op",
      payload: { bookId: "book-1", version: 1, deviceId: "a" }
    });
    const result = coalesceProgressOperations([move, progress]);
    expect(result).toHaveLength(2);
    expect(result[0]?.operationId).toBe("move-op");
  });

  it("coalesces duplicate import operations by book id", () => {
    const olderImport = makeOperation({
      operationId: "import-op-1",
      operationType: "IMPORT_BOOK",
      payload: { bookId: "book-1", title: "Old title" },
      updatedAt: "2026-01-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z"
    });
    const newerImport = makeOperation({
      operationId: "import-op-2",
      operationType: "IMPORT_BOOK",
      payload: { bookId: "book-1", title: "New title" },
      updatedAt: "2026-01-01T00:02:00.000Z",
      createdAt: "2026-01-01T00:02:00.000Z"
    });
    const otherImport = makeOperation({
      operationId: "import-op-3",
      operationType: "IMPORT_BOOK",
      payload: { bookId: "book-2", title: "Another" },
      updatedAt: "2026-01-01T00:03:00.000Z",
      createdAt: "2026-01-01T00:03:00.000Z"
    });

    const result = coalesceProgressOperations([olderImport, newerImport, otherImport]);
    expect(result).toHaveLength(2);
    expect(result.map((item) => item.operationId)).toContain("import-op-2");
    expect(result.map((item) => item.operationId)).toContain("import-op-3");
  });
});
