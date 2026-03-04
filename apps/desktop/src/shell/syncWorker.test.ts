import { describe, expect, it, vi } from "vitest";
import type { CloudMetadataAdapter, LocalStateAdapter } from "@lumio/core";
import { InMemoryQueueStorage } from "@lumio/core";
import { createSyncWorker } from "./syncWorker";

function makeFakeLocal(): LocalStateAdapter {
  return {
    getFolders: vi.fn().mockResolvedValue([]),
    getBooks: vi.fn().mockResolvedValue([]),
    getProgress: vi.fn().mockResolvedValue([]),
    upsertFolders: vi.fn().mockResolvedValue(undefined),
    upsertBooks: vi.fn().mockResolvedValue(undefined),
    upsertProgress: vi.fn().mockResolvedValue(undefined),
    deleteBooks: vi.fn().mockResolvedValue(undefined),
    getLastSyncCursor: vi.fn().mockResolvedValue(null),
    setLastSyncCursor: vi.fn().mockResolvedValue(undefined)
  };
}

function makeFakeCloud(): CloudMetadataAdapter {
  return {
    pullChanges: vi.fn().mockResolvedValue({
      folders: [],
      books: [],
      progress: [],
      nextCursor: "cursor-1"
    }),
    pushFolders: vi.fn().mockResolvedValue(undefined),
    pushBooks: vi.fn().mockResolvedValue(undefined),
    pushProgress: vi.fn().mockResolvedValue(undefined),
    deleteBooks: vi.fn().mockResolvedValue(undefined)
  };
}

describe("createSyncWorker", () => {
  it("runs sync once and returns summary", async () => {
    const cloud = makeFakeCloud();
    const local = makeFakeLocal();
    const queueStorage = new InMemoryQueueStorage();
    const { runOnce, stop } = createSyncWorker(cloud, local, queueStorage, {
      intervalMs: 999_999
    });

    const summary = await runOnce();

    expect(summary.pulled.books).toBe(0);
    expect(summary.cursor).toBe("cursor-1");
    expect(cloud.pullChanges).toHaveBeenCalledWith(null);

    stop();
  });

  it("invokes onBeforeSync and onAfterSync hooks", async () => {
    const onBeforeSync = vi.fn().mockResolvedValue(undefined);
    const onAfterSync = vi.fn().mockResolvedValue(undefined);
    const { runOnce, stop } = createSyncWorker(
      makeFakeCloud(),
      makeFakeLocal(),
      new InMemoryQueueStorage(),
      {
        intervalMs: 999_999,
        hooks: { onBeforeSync, onAfterSync }
      }
    );

    await runOnce();

    expect(onBeforeSync).toHaveBeenCalledTimes(1);
    expect(onAfterSync).toHaveBeenCalledTimes(1);
    expect(onAfterSync).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: "cursor-1",
        pulled: expect.any(Object),
        queue: expect.any(Object)
      })
    );

    stop();
  });

  it("calls onError when sync throws", async () => {
    const cloud = makeFakeCloud();
    (cloud.pullChanges as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("network error")
    );
    const onError = vi.fn();
    const { runOnce, stop } = createSyncWorker(
      cloud,
      makeFakeLocal(),
      new InMemoryQueueStorage(),
      {
        intervalMs: 999_999,
        hooks: { onError }
      }
    );

    await expect(runOnce()).rejects.toThrow("network error");
    expect(onError).toHaveBeenCalledWith(expect.any(Error));

    stop();
  });

  it("stop clears the interval", async () => {
    const { stop, runOnce } = createSyncWorker(
      makeFakeCloud(),
      makeFakeLocal(),
      new InMemoryQueueStorage(),
      { intervalMs: 10 }
    );

    stop();
    await new Promise((r) => setTimeout(r, 50));
    const summary = await runOnce();
    expect(summary).toBeDefined();
  });
});
