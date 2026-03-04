import type { CloudMetadataAdapter } from "@lumio/core";
import type { Book, CloudChanges, Folder, ProgressRecord } from "@lumio/core";
import { nowIsoString } from "@lumio/core";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

type SupabaseFolderRow = Database["public"]["Tables"]["folders"]["Row"];
type SupabaseBookRow = Database["public"]["Tables"]["books"]["Row"];
type SupabaseProgressRow = Database["public"]["Tables"]["progress"]["Row"];

function maxIsoTimestamp(values: string[]): string | null {
  if (values.length === 0) {
    return null;
  }
  let current = values[0] ?? null;
  if (!current) {
    return null;
  }
  for (const candidate of values.slice(1)) {
    if (Date.parse(candidate) > Date.parse(current)) {
      current = candidate;
    }
  }
  return current;
}

function mapFolderFromRow(row: SupabaseFolderRow): Folder {
  return {
    folderId: row.folder_id,
    userId: row.user_id,
    name: row.name,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  };
}

function mapFolderToRow(folder: Folder): Database["public"]["Tables"]["folders"]["Insert"] {
  return {
    folder_id: folder.folderId,
    user_id: folder.userId,
    name: folder.name,
    sort_order: folder.sortOrder,
    created_at: folder.createdAt,
    updated_at: folder.updatedAt,
    deleted_at: folder.deletedAt
  };
}

function mapBookFromRow(row: SupabaseBookRow): Book {
  return {
    bookId: row.book_id,
    userId: row.user_id,
    folderId: row.folder_id,
    title: row.title,
    author: row.author,
    originalFilename: row.original_filename,
    fileType: row.file_type,
    fileSizeBytes: row.file_size_bytes,
    contentHash: row.content_hash,
    coverRef: row.cover_ref,
    driveFileId: row.drive_file_id,
    driveMd5: row.drive_md5,
    syncStatus: row.sync_status,
    cacheStatus: row.cache_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  };
}

function mapBookToRow(book: Book): Database["public"]["Tables"]["books"]["Insert"] {
  return {
    book_id: book.bookId,
    user_id: book.userId,
    folder_id: book.folderId,
    title: book.title,
    author: book.author,
    original_filename: book.originalFilename,
    file_type: book.fileType,
    file_size_bytes: book.fileSizeBytes,
    content_hash: book.contentHash,
    cover_ref: book.coverRef,
    drive_file_id: book.driveFileId,
    drive_md5: book.driveMd5,
    sync_status: book.syncStatus,
    cache_status: book.cacheStatus,
    created_at: book.createdAt,
    updated_at: book.updatedAt,
    deleted_at: book.deletedAt
  };
}

function mapProgressFromRow(row: SupabaseProgressRow): ProgressRecord {
  return {
    bookId: row.book_id,
    userId: row.user_id,
    progressType: row.progress_type,
    payload: row.payload_json as ProgressRecord["payload"],
    version: row.version,
    lastReadAt: row.last_read_at,
    deviceId: row.device_id ?? "unknown-device",
    updatedAt: row.updated_at
  };
}

function mapProgressToRow(progress: ProgressRecord): Database["public"]["Tables"]["progress"]["Insert"] {
  return {
    book_id: progress.bookId,
    user_id: progress.userId,
    progress_type: progress.progressType,
    payload_json: progress.payload,
    version: progress.version,
    last_read_at: progress.lastReadAt,
    device_id: progress.deviceId,
    updated_at: progress.updatedAt
  };
}

async function unwrap<T>(
  call: PromiseLike<{
    data: T | null;
    error: { message: string } | null;
  }>
): Promise<T> {
  const { data, error } = await call;
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? ([] as unknown)) as T;
}

export class SupabaseMetadataAdapter implements CloudMetadataAdapter {
  constructor(
    private readonly client: SupabaseClient<any>,
    private readonly userId: string
  ) {}

  async pullChanges(sinceCursor: string | null): Promise<CloudChanges> {
    let folderQuery: any = this.client
      .from("folders")
      .select("*")
      .eq("user_id", this.userId)
      .order("updated_at", { ascending: true });
    let bookQuery: any = this.client
      .from("books")
      .select("*")
      .eq("user_id", this.userId)
      .order("updated_at", { ascending: true });
    let progressQuery: any = this.client
      .from("progress")
      .select("*")
      .eq("user_id", this.userId)
      .order("updated_at", { ascending: true });

    if (sinceCursor) {
      folderQuery = folderQuery.gt("updated_at", sinceCursor);
      bookQuery = bookQuery.gt("updated_at", sinceCursor);
      progressQuery = progressQuery.gt("updated_at", sinceCursor);
    }

    const [foldersRaw, booksRaw, progressRaw] = await Promise.all([
      unwrap(folderQuery),
      unwrap(bookQuery),
      unwrap(progressQuery)
    ]);

    const folders = (foldersRaw as SupabaseFolderRow[]).map(mapFolderFromRow);
    const books = (booksRaw as SupabaseBookRow[]).map(mapBookFromRow);
    const progress = (progressRaw as SupabaseProgressRow[]).map(mapProgressFromRow);

    const nextCursor =
      maxIsoTimestamp([
        ...folders.map((item) => item.updatedAt),
        ...books.map((item) => item.updatedAt),
        ...progress.map((item) => item.updatedAt)
      ]) ??
      sinceCursor ??
      nowIsoString();

    return {
      folders,
      books,
      progress,
      nextCursor
    };
  }

  async pushFolders(folders: Folder[]): Promise<void> {
    if (folders.length === 0) {
      return;
    }
    await unwrap(
      (this.client.from("folders") as any)
        .upsert(folders.map(mapFolderToRow), { onConflict: "folder_id" })
        .select("folder_id")
    );
  }

  async pushBooks(books: Book[]): Promise<void> {
    if (books.length === 0) {
      return;
    }
    await unwrap(
      (this.client.from("books") as any)
        .upsert(books.map(mapBookToRow), { onConflict: "book_id" })
        .select("book_id")
    );
  }

  async pushProgress(progress: ProgressRecord[]): Promise<void> {
    if (progress.length === 0) {
      return;
    }
    await unwrap(
      (this.client.from("progress") as any)
        .upsert(progress.map(mapProgressToRow), { onConflict: "book_id" })
        .select("book_id")
    );
  }

  async deleteBooks(bookIds: string[]): Promise<void> {
    if (bookIds.length === 0) {
      return;
    }
    const now = nowIsoString();
    await unwrap(
      (this.client.from("books") as any)
        .update({ deleted_at: now, updated_at: now })
        .eq("user_id", this.userId)
        .in("book_id", bookIds)
        .select("book_id")
    );
  }
}
