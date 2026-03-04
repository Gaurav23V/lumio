/**
 * Background sync worker invoking core SyncEngine with queue processing.
 * Runs periodic sync loop with optional before/after hooks.
 */

import type { CloudMetadataAdapter, LocalStateAdapter, QueueStorage } from "@lumio/core";
import { OfflineQueue, SyncEngine } from "@lumio/core";

export type SyncRunSummary = {
  pulled: { folders: number; books: number; progress: number };
  queue: { processed: number; failed: number };
  cursor: string;
};

export type SyncWorkerHooks = {
  onBeforeSync?: () => Promise<void>;
  onAfterSync?: (summary: SyncRunSummary) => Promise<void>;
  onError?: (error: unknown) => void;
};

export type SyncWorkerOptions = {
  intervalMs?: number;
  hooks?: SyncWorkerHooks;
};

const DEFAULT_INTERVAL_MS = 60_000;

/**
 * Creates and starts a background sync worker.
 * Stops when stop() is called.
 */
export function createSyncWorker(
  cloud: CloudMetadataAdapter,
  local: LocalStateAdapter,
  queueStorage: QueueStorage,
  options: SyncWorkerOptions = {}
): { stop: () => void; runOnce: () => Promise<SyncRunSummary> } {
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  const hooks = options.hooks ?? {};
  const queue = new OfflineQueue(queueStorage);
  const engine = new SyncEngine(cloud, local, queue);

  let timerId: ReturnType<typeof setInterval> | null = null;

  async function runOnce(): Promise<SyncRunSummary> {
    try {
      await hooks.onBeforeSync?.();
      const summary = await engine.runOnce();
      await hooks.onAfterSync?.(summary);
      return summary;
    } catch (error) {
      hooks.onError?.(error);
      throw error;
    }
  }

  function start(): void {
    if (timerId) return;
    timerId = setInterval(() => {
      runOnce().catch(() => {
        /* onError already called */
      });
    }, intervalMs);
  }

  function stop(): void {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  start();

  return {
    stop,
    runOnce
  };
}
