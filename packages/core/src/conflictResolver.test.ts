import { describe, expect, it } from "vitest";
import { resolveLastWriteWins, resolveProgressConflict } from "./conflictResolver";
import type { ProgressRecord } from "./types";

function makeProgress(partial: Partial<ProgressRecord>): ProgressRecord {
  return {
    bookId: "018f4fca-56a0-7b8a-9eea-1258356b2001",
    userId: "018f4fca-56a0-7b8a-9eea-1258356b2002",
    progressType: "PDF",
    payload: { pageNumber: 5, scrollRatio: 0.45, zoom: 1.2 },
    version: 1,
    lastReadAt: "2026-01-01T00:00:00.000Z",
    deviceId: "device-a",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial
  };
}

describe("resolveLastWriteWins", () => {
  it("prefers larger version", () => {
    const local = { version: 2, updatedAt: "2026-01-01T00:00:00.000Z", deviceId: "a" };
    const remote = { version: 3, updatedAt: "2026-01-01T00:00:00.000Z", deviceId: "b" };
    expect(resolveLastWriteWins(local, remote)).toBe(remote);
  });

  it("uses device id tie-break when version is equal", () => {
    const local = { version: 4, updatedAt: "2026-01-01T00:00:00.000Z", deviceId: "a" };
    const remote = { version: 4, updatedAt: "2026-01-01T00:00:00.000Z", deviceId: "z" };
    expect(resolveLastWriteWins(local, remote)).toBe(remote);
  });

  it("uses updatedAt as final tie-break", () => {
    const local = { version: 4, updatedAt: "2026-01-01T00:00:00.000Z", deviceId: "z" };
    const remote = { version: 4, updatedAt: "2026-01-01T01:00:00.000Z", deviceId: "z" };
    expect(resolveLastWriteWins(local, remote)).toBe(remote);
  });
});

describe("resolveProgressConflict", () => {
  it("resolves with deterministic LWW", () => {
    const local = makeProgress({ version: 6, deviceId: "desktop-a", updatedAt: "2026-01-01T00:00:00.000Z" });
    const remote = makeProgress({
      version: 6,
      deviceId: "desktop-b",
      updatedAt: "2026-01-01T00:00:00.000Z",
      payload: { pageNumber: 12, scrollRatio: 0.2, zoom: 1.0 }
    });
    expect(resolveProgressConflict(local, remote)).toEqual(remote);
  });
});
