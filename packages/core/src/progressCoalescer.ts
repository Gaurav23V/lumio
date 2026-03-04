import { resolveLastWriteWins } from "./conflictResolver";
import type { SyncOperation } from "./types";

function isProgressOp(operation: SyncOperation): boolean {
  return operation.operationType === "UPDATE_PROGRESS";
}

function getProgressBookId(operation: SyncOperation): string | null {
  const bookId = operation.payload.bookId;
  return typeof bookId === "string" ? bookId : null;
}

function asVersioned(operation: SyncOperation) {
  const version = operation.payload.version;
  const deviceId = operation.payload.deviceId;
  return {
    version: typeof version === "number" ? version : 0,
    deviceId: typeof deviceId === "string" ? deviceId : "",
    updatedAt: operation.updatedAt
  };
}

export function coalesceProgressOperations(operations: SyncOperation[]): SyncOperation[] {
  const byBook = new Map<string, SyncOperation>();
  const nonProgress: SyncOperation[] = [];

  for (const operation of operations) {
    if (!isProgressOp(operation)) {
      nonProgress.push(operation);
      continue;
    }

    const bookId = getProgressBookId(operation);
    if (!bookId) {
      nonProgress.push(operation);
      continue;
    }

    const existing = byBook.get(bookId);
    if (!existing) {
      byBook.set(bookId, operation);
      continue;
    }

    const existingComparable = asVersioned(existing);
    const operationComparable = asVersioned(operation);
    const winner = resolveLastWriteWins(existingComparable, operationComparable);
    byBook.set(bookId, winner === existingComparable ? existing : operation);
  }

  return [...nonProgress, ...byBook.values()].sort((a, b) => {
    const aTime = Date.parse(a.createdAt);
    const bTime = Date.parse(b.createdAt);
    return aTime - bTime;
  });
}
