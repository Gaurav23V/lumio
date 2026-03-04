import type { ProgressRecord } from "./types";

type VersionedRecord = {
  version: number;
  updatedAt: string;
  deviceId?: string | null;
};

function compareIso(a: string, b: string): number {
  const aTime = Date.parse(a);
  const bTime = Date.parse(b);
  if (aTime === bTime) {
    return 0;
  }
  return aTime > bTime ? 1 : -1;
}

export function resolveLastWriteWins<T extends VersionedRecord>(local: T, remote: T): T {
  if (local.version !== remote.version) {
    return local.version > remote.version ? local : remote;
  }

  const localDevice = local.deviceId ?? "";
  const remoteDevice = remote.deviceId ?? "";
  if (localDevice !== remoteDevice) {
    return localDevice > remoteDevice ? local : remote;
  }

  const updatedAtComparison = compareIso(local.updatedAt, remote.updatedAt);
  if (updatedAtComparison >= 0) {
    return local;
  }
  return remote;
}

export function resolveProgressConflict(local: ProgressRecord, remote: ProgressRecord): ProgressRecord {
  return resolveLastWriteWins(local, remote);
}
