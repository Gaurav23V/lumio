import type { FileType } from "@lumio/core";

export type LibraryFolderItem = {
  folderId: string;
  name: string;
  sortOrder: number;
  deletedAt: string | null;
};

export type LibraryBookItem = {
  bookId: string;
  title: string;
  author: string | null;
  folderId: string | null;
  fileType: FileType;
  syncStatus: "LOCAL_ONLY" | "UPLOADING" | "SYNCED" | "ERROR";
  cacheStatus: "NOT_CACHED" | "CACHING" | "CACHED";
  updatedAt: string;
};
