/**
 * Cache manager for book files using Tauri fs plugin.
 * Stores cached book files under app local data directory.
 */

import {
  BaseDirectory,
  exists as fsExists,
  mkdir,
  readDir,
  readFile,
  remove,
  stat,
  writeFile
} from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import { appLocalDataDir } from "@tauri-apps/api/path";

export const CACHE_BOOKS_DIR = "cache/books";

export type CacheEntry = {
  bookId: string;
  path: string;
  size: number;
  lastAccessed: string;
  status: "CACHED" | "CACHING";
};

export interface CacheManagerApi {
  getCacheRoot(): Promise<string>;
  getBookPath(bookId: string, extension: string): Promise<string>;
  ensureCacheDir(): Promise<void>;
  writeBook(bookId: string, extension: string, data: Uint8Array): Promise<string>;
  readBook(bookId: string, extension: string): Promise<Uint8Array>;
  removeBook(bookId: string, extension: string): Promise<void>;
  getEntry(bookId: string, extension: string): Promise<CacheEntry | null>;
  listCachedBooks(): Promise<CacheEntry[]>;
}

/**
 * Creates a cache manager using fs plugin paths.
 * Uses $APPLOCALDATA/cache/books for book files.
 */
export function createCacheManager(): CacheManagerApi {
  return {
    async getCacheRoot(): Promise<string> {
      const base = await appLocalDataDir();
      return await join(base, CACHE_BOOKS_DIR);
    },

    async getBookPath(bookId: string, extension: string): Promise<string> {
      const root = await this.getCacheRoot();
      const safe = bookId.replace(/[^a-zA-Z0-9-_]/g, "_");
      return await join(root, `${safe}.${extension}`);
    },

    async ensureCacheDir(): Promise<void> {
      const pathExists = await fsExists(CACHE_BOOKS_DIR, {
        baseDir: BaseDirectory.AppLocalData
      });
      if (!pathExists) {
        await mkdir(CACHE_BOOKS_DIR, {
          baseDir: BaseDirectory.AppLocalData,
          recursive: true
        });
      }
    },

    async writeBook(
      bookId: string,
      extension: string,
      data: Uint8Array
    ): Promise<string> {
      await this.ensureCacheDir();
      const relPath = `${CACHE_BOOKS_DIR}/${bookId.replace(/[^a-zA-Z0-9-_]/g, "_")}.${extension}`;
      await writeFile(relPath, data, {
        baseDir: BaseDirectory.AppLocalData,
        create: true
      });
      return await join(await appLocalDataDir(), relPath);
    },

    async readBook(bookId: string, extension: string): Promise<Uint8Array> {
      const path = `${CACHE_BOOKS_DIR}/${bookId.replace(/[^a-zA-Z0-9-_]/g, "_")}.${extension}`;
      return readFile(path, { baseDir: BaseDirectory.AppLocalData });
    },

    async removeBook(bookId: string, extension: string): Promise<void> {
      const relPath = `${CACHE_BOOKS_DIR}/${bookId.replace(/[^a-zA-Z0-9-_]/g, "_")}.${extension}`;
      const pathExists = await fsExists(relPath, { baseDir: BaseDirectory.AppLocalData });
      if (pathExists) {
        await remove(relPath, { baseDir: BaseDirectory.AppLocalData });
      }
    },

    async getEntry(bookId: string, extension: string): Promise<CacheEntry | null> {
      const relPath = `${CACHE_BOOKS_DIR}/${bookId.replace(/[^a-zA-Z0-9-_]/g, "_")}.${extension}`;
      const pathExists = await fsExists(relPath, { baseDir: BaseDirectory.AppLocalData });
      if (!pathExists) return null;
      const info = await stat(relPath, { baseDir: BaseDirectory.AppLocalData });
      const base = await appLocalDataDir();
      const fullPath = await join(base, relPath);
      return {
        bookId,
        path: fullPath,
        size: info.size,
        lastAccessed: (info.atime ?? info.mtime ?? new Date()).toISOString(),
        status: "CACHED"
      };
    },

    async listCachedBooks(): Promise<CacheEntry[]> {
      const rootExists = await fsExists(CACHE_BOOKS_DIR, {
        baseDir: BaseDirectory.AppLocalData
      });
      if (!rootExists) return [];
      const entries = await readDir(CACHE_BOOKS_DIR, {
        baseDir: BaseDirectory.AppLocalData
      });
      const results: CacheEntry[] = [];
      for (const entry of entries) {
        if (!entry.isFile) continue;
        const match = entry.name.match(/^(.+)\.(pdf|epub)$/i);
        const bookIdBase = match?.[1];
        if (!match || !bookIdBase) continue;
        const relPath = `${CACHE_BOOKS_DIR}/${entry.name}`;
        const info = await stat(relPath, { baseDir: BaseDirectory.AppLocalData });
        const base = await appLocalDataDir();
        const bookId = bookIdBase.replace(/_/g, "-");
        results.push({
          bookId,
          path: await join(base, relPath),
          size: info.size,
          lastAccessed: (info.atime ?? info.mtime ?? new Date()).toISOString(),
          status: "CACHED"
        });
      }
      return results;
    }
  };
}
