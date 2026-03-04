import { z } from "zod";

export const FILE_TYPES = ["PDF", "EPUB"] as const;
export type FileType = (typeof FILE_TYPES)[number];

export const PROGRESS_TYPES = ["PDF", "EPUB"] as const;
export type ProgressType = (typeof PROGRESS_TYPES)[number];

export const SYNC_STATUSES = ["LOCAL_ONLY", "UPLOADING", "SYNCED", "ERROR"] as const;
export type SyncStatus = (typeof SYNC_STATUSES)[number];

export const CACHE_STATUSES = ["NOT_CACHED", "CACHING", "CACHED"] as const;
export type CacheStatus = (typeof CACHE_STATUSES)[number];

export const BookSchema = z.object({
  bookId: z.uuid(),
  userId: z.uuid(),
  folderId: z.uuid().nullable(),
  title: z.string().min(1),
  author: z.string().nullable(),
  originalFilename: z.string().min(1),
  fileType: z.enum(FILE_TYPES),
  fileSizeBytes: z.number().int().nonnegative(),
  contentHash: z.string().min(1),
  coverRef: z.string().nullable(),
  driveFileId: z.string().min(1),
  driveMd5: z.string().nullable(),
  syncStatus: z.enum(SYNC_STATUSES),
  cacheStatus: z.enum(CACHE_STATUSES),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable()
});

export type Book = z.infer<typeof BookSchema>;

export const FolderSchema = z.object({
  folderId: z.uuid(),
  userId: z.uuid(),
  name: z.string().min(1),
  sortOrder: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable()
});

export type Folder = z.infer<typeof FolderSchema>;

export const PdfProgressPayloadSchema = z.object({
  pageNumber: z.number().int().positive(),
  scrollRatio: z.number().min(0).max(1),
  zoom: z.number().positive().nullable()
});

export type PdfProgressPayload = z.infer<typeof PdfProgressPayloadSchema>;

export const EpubProgressPayloadSchema = z.object({
  cfi: z.string().min(1),
  tocHref: z.string().nullable(),
  percent: z.number().min(0).max(1).nullable()
});

export type EpubProgressPayload = z.infer<typeof EpubProgressPayloadSchema>;

export const ProgressPayloadSchema = z.union([PdfProgressPayloadSchema, EpubProgressPayloadSchema]);

export type ProgressPayload = PdfProgressPayload | EpubProgressPayload;

export const ProgressSchema = z.object({
  bookId: z.uuid(),
  userId: z.uuid(),
  progressType: z.enum(PROGRESS_TYPES),
  payload: ProgressPayloadSchema,
  version: z.number().int().nonnegative(),
  lastReadAt: z.string().datetime(),
  deviceId: z.string().min(1),
  updatedAt: z.string().datetime()
});

export type ProgressRecord = z.infer<typeof ProgressSchema>;

export const SyncOperationTypes = [
  "IMPORT_BOOK",
  "UPDATE_PROGRESS",
  "MOVE_BOOK_FOLDER",
  "DELETE_BOOK",
  "UPLOAD_BOOK_FILE",
  "DOWNLOAD_BOOK_FILE"
] as const;

export type SyncOperationType = (typeof SyncOperationTypes)[number];

export const SyncOperationStatusTypes = ["PENDING", "PROCESSING", "FAILED"] as const;
export type SyncOperationStatus = (typeof SyncOperationStatusTypes)[number];

export const SyncOperationSchema = z.object({
  operationId: z.string().min(1),
  operationType: z.enum(SyncOperationTypes),
  payload: z.record(z.string(), z.unknown()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  attempts: z.number().int().nonnegative(),
  status: z.enum(SyncOperationStatusTypes),
  nextRetryAt: z.string().datetime().nullable(),
  lastError: z.string().nullable()
});

export type SyncOperation = z.infer<typeof SyncOperationSchema>;

export type CloudChanges = {
  folders: Folder[];
  books: Book[];
  progress: ProgressRecord[];
  nextCursor: string;
};

export function nowIsoString(date = new Date()): string {
  return date.toISOString();
}
