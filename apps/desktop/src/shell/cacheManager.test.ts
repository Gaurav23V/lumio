import { describe, expect, it, vi, beforeEach } from "vitest";
import { createCacheManager, CACHE_BOOKS_DIR } from "./cacheManager";

const mockExists = vi.fn();
const mockMkdir = vi.fn();
const mockReadFile = vi.fn();
const mockWriteFile = vi.fn();
const mockRemove = vi.fn();
const mockStat = vi.fn();
const mockReadDir = vi.fn();

vi.mock("@tauri-apps/plugin-fs", () => ({
  BaseDirectory: { AppLocalData: 15 },
  exists: (...args: unknown[]) => mockExists(...args),
  mkdir: (...args: unknown[]) => mockMkdir(...args),
  readFile: (...args: unknown[]) => mockReadFile(...args),
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
  remove: (...args: unknown[]) => mockRemove(...args),
  stat: (...args: unknown[]) => mockStat(...args),
  readDir: (...args: unknown[]) => mockReadDir(...args)
}));

vi.mock("@tauri-apps/api/path", () => ({
  appLocalDataDir: vi.fn().mockResolvedValue("/tmp/lumio-local"),
  join: vi.fn((...args: string[]) => args.filter(Boolean).join("/"))
}));

describe("createCacheManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExists.mockResolvedValue(false);
    mockMkdir.mockResolvedValue(undefined);
    mockReadFile.mockResolvedValue(new Uint8Array([1, 2, 3]));
    mockWriteFile.mockResolvedValue(undefined);
    mockRemove.mockResolvedValue(undefined);
    mockStat.mockResolvedValue({
      size: 100,
      atime: new Date("2026-01-01"),
      mtime: new Date("2026-01-01")
    });
    mockReadDir.mockResolvedValue([]);
  });

  it("getCacheRoot returns path with cache dir", async () => {
    const cache = createCacheManager();
    const root = await cache.getCacheRoot();
    expect(root).toContain(CACHE_BOOKS_DIR);
  });

  it("ensureCacheDir creates dir when missing", async () => {
    mockExists.mockResolvedValue(false);
    const cache = createCacheManager();
    await cache.ensureCacheDir();
    expect(mockMkdir).toHaveBeenCalledWith(CACHE_BOOKS_DIR, {
      baseDir: 15,
      recursive: true
    });
  });

  it("ensureCacheDir skips when dir exists", async () => {
    mockExists.mockResolvedValue(true);
    const cache = createCacheManager();
    await cache.ensureCacheDir();
    expect(mockMkdir).not.toHaveBeenCalled();
  });

  it("writeBook creates file and returns path", async () => {
    const cache = createCacheManager();
    const data = new Uint8Array([1, 2, 3]);
    const path = await cache.writeBook("book-uuid-1", "pdf", data);
    expect(mockWriteFile).toHaveBeenCalled();
    expect(path).toBeDefined();
  });

  it("readBook reads file content", async () => {
    const expected = new Uint8Array([5, 6, 7]);
    mockReadFile.mockResolvedValue(expected);
    const cache = createCacheManager();
    const data = await cache.readBook("book-uuid-1", "pdf");
    expect(data).toEqual(expected);
  });

  it("removeBook removes file when exists", async () => {
    mockExists.mockResolvedValue(true);
    const cache = createCacheManager();
    await cache.removeBook("book-uuid-1", "pdf");
    expect(mockRemove).toHaveBeenCalled();
  });

  it("getEntry returns null when file missing", async () => {
    mockExists.mockResolvedValue(false);
    const cache = createCacheManager();
    const entry = await cache.getEntry("book-uuid-1", "pdf");
    expect(entry).toBeNull();
  });

  it("getEntry returns entry when file exists", async () => {
    mockExists.mockResolvedValue(true);
    const cache = createCacheManager();
    const entry = await cache.getEntry("book-uuid-1", "pdf");
    expect(entry).toMatchObject({
      bookId: "book-uuid-1",
      size: 100,
      status: "CACHED"
    });
  });

  it("listCachedBooks returns empty when dir missing", async () => {
    mockExists.mockResolvedValue(false);
    const cache = createCacheManager();
    const list = await cache.listCachedBooks();
    expect(list).toEqual([]);
  });

  it("listCachedBooks returns entries for pdf/epub files", async () => {
    mockExists.mockResolvedValue(true);
    mockReadDir.mockResolvedValue([
      { name: "018f4fca_56a0_7b8a_9eea_1258356b2102.pdf", isFile: true },
      { name: "other.txt", isFile: true }
    ]);
    const cache = createCacheManager();
    const list = await cache.listCachedBooks();
    expect(list).toHaveLength(1);
    expect(list[0]!.bookId).toBe("018f4fca-56a0-7b8a-9eea-1258356b2102");
  });
});
