import { resolveLastWriteWins } from "./conflictResolver";
import type { SyncOperation } from "./types";

function isProgressOp(operation: SyncOperation): boolean {
  return operation.operationType === "UPDATE_PROGRESS";
}

function isImportBookOp(operation: SyncOperation): boolean {
  return operation.operationType === "IMPORT_BOOK";
}

function getPayloadBookId(operation: SyncOperation): string | null {
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
  const progressByBook = new Map<string, SyncOperation>();
  const importByBook = new Map<string, SyncOperation>();
  const passthrough: SyncOperation[] = [];

  for (const operation of operations) {
    if (isProgressOp(operation)) {
      const bookId = getPayloadBookId(operation);
      if (!bookId) {
        passthrough.push(operation);
        continue;
      }

      const existing = progressByBook.get(bookId);
      if (!existing) {
        progressByBook.set(bookId, operation);
        continue;
      }

      const existingComparable = asVersioned(existing);
      const operationComparable = asVersioned(operation);
      const winner = resolveLastWriteWins(existingComparable, operationComparable);
      progressByBook.set(bookId, winner === existingComparable ? existing : operation);
      continue;
    }

    if (isImportBookOp(operation)) {
      const bookId = getPayloadBookId(operation);
      if (!bookId) {
        passthrough.push(operation);
        continue;
      }

      const existing = importByBook.get(bookId);
      if (!existing) {
        importByBook.set(bookId, operation);
        continue;
      }
      const existingTime = Date.parse(existing.updatedAt);
      const candidateTime = Date.parse(operation.updatedAt);
      importByBook.set(bookId, candidateTime >= existingTime ? operation : existing);
      continue;
    }
    passthrough.push(operation);
  }

  return [...passthrough, ...importByBook.values(), ...progressByBook.values()].sort((a, b) => {
    const aTime = Date.parse(a.createdAt);
    const bTime = Date.parse(b.createdAt);
    return aTime - bTime;
  });
}
