import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { IndexedDbLocalAdapter } from "./indexedDbLocalAdapter";

describe("IndexedDbLocalAdapter", () => {
  it("tracks schema version and sync cursor", async () => {
    const adapter = new IndexedDbLocalAdapter({ dbName: "lumio-test-1", version: 2 });
    expect(await adapter.getSchemaVersion()).toBe(2);

    await adapter.setLastSyncCursor("cursor-123");
    expect(await adapter.getLastSyncCursor()).toBe("cursor-123");
  });

  it("stores and loads queue operations", async () => {
    const adapter = new IndexedDbLocalAdapter({ dbName: "lumio-test-2" });
    await adapter.save([
      {
        operationId: "op-1",
        operationType: "UPDATE_PROGRESS",
        payload: { bookId: "book-1", version: 1, deviceId: "a" },
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        attempts: 0,
        status: "PENDING",
        nextRetryAt: null,
        lastError: null
      }
    ]);
    const queue = await adapter.load();
    expect(queue).toHaveLength(1);
    expect(queue[0]?.operationId).toBe("op-1");
  });
});
