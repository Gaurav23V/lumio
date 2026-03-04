import { describe, expect, it } from "vitest";
import { InMemoryQueueStorage, OfflineQueue, calculateBackoffMs } from "./offlineQueue";

describe("calculateBackoffMs", () => {
  it("increases exponentially and respects max value", () => {
    expect(calculateBackoffMs(1, 1000, 60_000)).toBe(1000);
    expect(calculateBackoffMs(2, 1000, 60_000)).toBe(2000);
    expect(calculateBackoffMs(20, 1000, 60_000)).toBe(60_000);
  });
});

describe("OfflineQueue", () => {
  it("enqueues and returns runnable items", async () => {
    const queue = new OfflineQueue(new InMemoryQueueStorage());
    await queue.enqueue({
      operationId: "op-1",
      operationType: "UPDATE_PROGRESS",
      payload: { bookId: "book-1", version: 1, deviceId: "desktop-a" }
    });
    const runnable = await queue.getRunnable();
    expect(runnable).toHaveLength(1);
    expect(runnable[0]?.operationId).toBe("op-1");
  });

  it("marks failures with retry timestamps", async () => {
    const queue = new OfflineQueue(new InMemoryQueueStorage());
    await queue.enqueue({
      operationId: "op-1",
      operationType: "UPDATE_PROGRESS",
      payload: { bookId: "book-1", version: 1, deviceId: "desktop-a" }
    });
    const now = new Date("2026-01-01T00:00:00.000Z");
    await queue.markFailed("op-1", "network down", now);
    const state = await queue.listAll();
    expect(state[0]?.status).toBe("FAILED");
    expect(state[0]?.nextRetryAt).toBe("2026-01-01T00:00:01.000Z");
  });

  it("coalesces multiple progress updates for same book", async () => {
    const queue = new OfflineQueue(new InMemoryQueueStorage());
    await queue.enqueue({
      operationId: "op-1",
      operationType: "UPDATE_PROGRESS",
      payload: { bookId: "book-1", version: 1, deviceId: "desktop-a" }
    });
    await queue.enqueue({
      operationId: "op-2",
      operationType: "UPDATE_PROGRESS",
      payload: { bookId: "book-1", version: 2, deviceId: "desktop-a" }
    });
    await queue.coalesceProgress();
    const state = await queue.listAll();
    expect(state).toHaveLength(1);
    expect(state[0]?.operationId).toBe("op-2");
  });
});
