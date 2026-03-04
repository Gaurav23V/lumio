import type { Book, CloudChanges, Folder, ProgressRecord, SyncOperation } from "./types";

export interface CloudMetadataAdapter {
  pullChanges(sinceCursor: string | null): Promise<CloudChanges>;
  pushFolders(folders: Folder[]): Promise<void>;
  pushBooks(books: Book[]): Promise<void>;
  pushProgress(progress: ProgressRecord[]): Promise<void>;
  deleteBooks(bookIds: string[]): Promise<void>;
}

export interface FileCloudAdapter {
  uploadBook(params: {
    bookId: string;
    filename: string;
    mimeType: string;
    bytes: Uint8Array;
  }): Promise<{ driveFileId: string; md5: string | null }>;
  downloadBook(driveFileId: string): Promise<Uint8Array>;
}

export interface LocalStateAdapter {
  getFolders(): Promise<Folder[]>;
  getBooks(): Promise<Book[]>;
  getProgress(): Promise<ProgressRecord[]>;
  upsertFolders(folders: Folder[]): Promise<void>;
  upsertBooks(books: Book[]): Promise<void>;
  upsertProgress(progress: ProgressRecord[]): Promise<void>;
  deleteBooks(bookIds: string[]): Promise<void>;
  getLastSyncCursor(): Promise<string | null>;
  setLastSyncCursor(cursor: string): Promise<void>;
}

export interface QueueStorage {
  load(): Promise<SyncOperation[]>;
  save(operations: SyncOperation[]): Promise<void>;
}

export interface AuthAdapter {
  getUserId(): Promise<string>;
  getDeviceId(): Promise<string>;
}
