import { coalesceProgressOperations } from "./progressCoalescer";
import { nowIsoString } from "./types";
import type { QueueStorage } from "./adapters";
import type { SyncOperation, SyncOperationType } from "./types";

const DEFAULT_BASE_DELAY_MS = 1_000;
const DEFAULT_MAX_DELAY_MS = 60_000;
const PROCESSING_STALE_AFTER_MS = 5 * 60 * 1000;

export function calculateBackoffMs(
  attempts: number,
  baseMs = DEFAULT_BASE_DELAY_MS,
  maxMs = DEFAULT_MAX_DELAY_MS
): number {
  const exponent = Math.max(0, attempts - 1);
  const value = baseMs * 2 ** exponent;
  return Math.min(maxMs, value);
}

export type QueueCreateInput = {
  operationType: SyncOperationType;
  payload: Record<string, unknown>;
  operationId: string;
};

export class OfflineQueue {
  private loaded = false;
  private operations: SyncOperation[] = [];

  constructor(private readonly storage: QueueStorage) {}

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) {
      return;
    }
    this.operations = await this.storage.load();
    this.loaded = true;
  }

  private async flush(): Promise<void> {
    await this.storage.save(this.operations);
  }

  async enqueue(input: QueueCreateInput, now = new Date()): Promise<SyncOperation> {
    await this.ensureLoaded();
    const iso = nowIsoString(now);
    const next: SyncOperation = {
      operationId: input.operationId,
      operationType: input.operationType,
      payload: input.payload,
      createdAt: iso,
      updatedAt: iso,
      attempts: 0,
      status: "PENDING",
      nextRetryAt: null,
      lastError: null
    };
    this.operations.push(next);
    await this.flush();
    return next;
  }

  async listAll(): Promise<SyncOperation[]> {
    await this.ensureLoaded();
    return [...this.operations];
  }

  async getRunnable(now = new Date(), limit = 100): Promise<SyncOperation[]> {
    await this.ensureLoaded();
    const nowMs = now.getTime();
    return this.operations
      .filter((item) => {
        if (item.status === "PROCESSING") {
          return Date.parse(item.updatedAt) + PROCESSING_STALE_AFTER_MS <= nowMs;
        }
        if (!item.nextRetryAt) {
          return true;
        }
        return Date.parse(item.nextRetryAt) <= nowMs;
      })
      .slice(0, limit);
  }

  async markProcessing(operationId: string, now = new Date()): Promise<void> {
    await this.ensureLoaded();
    this.operations = this.operations.map((item) =>
      item.operationId === operationId
        ? { ...item, status: "PROCESSING", updatedAt: nowIsoString(now) }
        : item
    );
    await this.flush();
  }

  async markCompleted(operationId: string): Promise<void> {
    await this.ensureLoaded();
    this.operations = this.operations.filter((item) => item.operationId !== operationId);
    await this.flush();
  }

  async markFailed(operationId: string, errorMessage: string, now = new Date()): Promise<void> {
    await this.ensureLoaded();
    this.operations = this.operations.map((item) => {
      if (item.operationId !== operationId) {
        return item;
      }
      const attempts = item.attempts + 1;
      const delay = calculateBackoffMs(attempts);
      const retryAt = new Date(now.getTime() + delay);
      return {
        ...item,
        attempts,
        status: "FAILED",
        lastError: errorMessage,
        nextRetryAt: nowIsoString(retryAt),
        updatedAt: nowIsoString(now)
      };
    });
    await this.flush();
  }

  async coalesceProgress(): Promise<void> {
    await this.ensureLoaded();
    this.operations = coalesceProgressOperations(this.operations);
    await this.flush();
  }
}

export class InMemoryQueueStorage implements QueueStorage {
  private state: SyncOperation[] = [];

  async load(): Promise<SyncOperation[]> {
    return structuredClone(this.state);
  }

  async save(operations: SyncOperation[]): Promise<void> {
    this.state = structuredClone(operations);
  }
}
