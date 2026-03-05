import type { FileCloudAdapter } from "@lumio/core";
import { withRetry } from "../shared/retry";

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";
const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

type DriveFolder = {
  id: string;
  name: string;
};

type DriveFileMetadata = {
  id: string;
  md5Checksum?: string;
  size?: string;
  modifiedTime?: string;
  name?: string;
};

type DriveApiErrorPayload = {
  error?: {
    code?: number;
    message?: string;
    errors?: Array<{ message?: string; reason?: string }>;
  };
};

/**
 * Parses Google Drive API error JSON and returns an actionable user-facing message.
 * Handles 401 (missing/invalid token), 403 (insufficient scope), and other API errors.
 */
export function parseDriveApiError(body: string, status: number): string {
  try {
    const parsed = JSON.parse(body) as DriveApiErrorPayload;
    const msg = parsed.error?.message;
    const reason = parsed.error?.errors?.[0]?.reason ?? parsed.error?.errors?.[0]?.message;
    if (msg) {
      const hint =
        status === 401
          ? " Sign out and sign in again to refresh your Drive token."
          : status === 403 && /insufficient|scope|permission/i.test(msg)
            ? " Ensure the app has Drive file access. Sign out and sign in again to grant scope."
            : "";
      return `${msg}${hint}`;
    }
    if (reason) {
      return String(reason);
    }
  } catch {
    // body is not JSON, fall through
  }
  if (status === 401) {
    return "Drive authentication failed. Sign out and sign in again to refresh your token.";
  }
  if (status === 403) {
    return "Drive access denied. Ensure the app has Drive file scope. Sign out and sign in again.";
  }
  return `Drive API error (${status}). ${body.slice(0, 200)}`;
}

class HttpResponseError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: string
  ) {
    const actionable = parseDriveApiError(body, status);
    super(`${message} ${actionable}`);
    this.name = "HttpResponseError";
  }
}

/**
 * Extracts an actionable error message from Drive adapter errors for display to users.
 */
export function extractDriveErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message;
    if (/provider token|token is missing/i.test(msg)) {
      return "Google Drive access token is missing. Sign out and sign in again to grant Drive access.";
    }
    return msg;
  }
  return "Upload failed. Please try again or sign out and sign in.";
}

export type GoogleDriveAdapterOptions = {
  getAccessToken: () => Promise<string>;
  fetchImpl?: typeof fetch;
  appFolderName?: string;
  booksFolderName?: string;
  chunkSizeBytes?: number;
};

function defaultFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return globalThis.fetch(input, init);
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

function isAuthOrTokenError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const m = error.message.toLowerCase();
  return (
    m.includes("provider token") ||
    m.includes("access token") ||
    m.includes("token is missing") ||
    m.includes("insufficient") ||
    m.includes("unauthorized") ||
    m.includes("invalid token")
  );
}

function toUrl(path: string, base = DRIVE_API_BASE): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${base}${path}`;
}

function sanitizeChunkSize(input: number): number {
  const minimum = 256 * 1024;
  if (input <= minimum) {
    return minimum;
  }
  return Math.floor(input / minimum) * minimum;
}

function escapeDriveQueryLiteral(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

function extensionForMimeType(mimeType: string): string {
  if (mimeType.includes("epub")) {
    return "epub";
  }
  return "pdf";
}

export class GoogleDriveAdapter implements FileCloudAdapter {
  private readonly fetchImpl: typeof fetch;
  private readonly appFolderName: string;
  private readonly booksFolderName: string;
  private readonly chunkSizeBytes: number;
  private folderCache: { appId: string; booksId: string } | null = null;

  constructor(private readonly options: GoogleDriveAdapterOptions) {
    this.fetchImpl = options.fetchImpl ?? defaultFetch;
    this.appFolderName = options.appFolderName ?? "Lumio";
    this.booksFolderName = options.booksFolderName ?? "books";
    this.chunkSizeBytes = sanitizeChunkSize(options.chunkSizeBytes ?? 4 * 1024 * 1024);
  }

  async ensureLumioFolders(): Promise<{ appId: string; booksId: string }> {
    if (this.folderCache) {
      return this.folderCache;
    }
    const appFolder = await this.getOrCreateFolder(this.appFolderName, "root");
    const booksFolder = await this.getOrCreateFolder(this.booksFolderName, appFolder.id);
    this.folderCache = { appId: appFolder.id, booksId: booksFolder.id };
    return this.folderCache;
  }

  async uploadBook(params: {
    bookId: string;
    filename: string;
    mimeType: string;
    bytes: Uint8Array;
  }): Promise<{ driveFileId: string; md5: string | null }> {
    const folders = await this.ensureLumioFolders();
    const filenameExt = params.filename.split(".").pop()?.toLowerCase();
    const extension =
      filenameExt === "pdf" || filenameExt === "epub"
        ? filenameExt
        : extensionForMimeType(params.mimeType);
    const driveFilename = `book_${params.bookId}.${extension}`;

    const sessionUrl = await this.startResumableSession({
      name: driveFilename,
      mimeType: params.mimeType,
      parentId: folders.booksId,
      size: params.bytes.byteLength
    });

    const metadata = await this.uploadResumableBytes(sessionUrl, params.bytes);
    return {
      driveFileId: metadata.id,
      md5: metadata.md5Checksum ?? null
    };
  }

  async downloadBook(driveFileId: string): Promise<Uint8Array> {
    const response = await this.request(
      `/files/${encodeURIComponent(driveFileId)}?alt=media`,
      { method: "GET" },
      DRIVE_API_BASE
    );
    const bytes = await response.arrayBuffer();
    return new Uint8Array(bytes);
  }

  async getFileMetadata(driveFileId: string): Promise<DriveFileMetadata> {
    const response = await this.request(
      `/files/${encodeURIComponent(driveFileId)}?fields=id,name,md5Checksum,size,modifiedTime,parents`,
      { method: "GET" },
      DRIVE_API_BASE
    );
    return (await response.json()) as DriveFileMetadata;
  }

  async deleteBook(driveFileId: string): Promise<void> {
    await this.request(`/files/${encodeURIComponent(driveFileId)}`, { method: "DELETE" }, DRIVE_API_BASE);
  }

  private async startResumableSession(params: {
    name: string;
    mimeType: string;
    parentId: string;
    size: number;
  }): Promise<string> {
    const response = await this.request(
      "/files?uploadType=resumable&fields=id,md5Checksum,size,modifiedTime",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Type": params.mimeType,
          "X-Upload-Content-Length": String(params.size)
        },
        body: JSON.stringify({
          name: params.name,
          mimeType: params.mimeType,
          parents: [params.parentId]
        })
      },
      DRIVE_UPLOAD_BASE
    );

    const location = response.headers.get("location");
    if (!location) {
      throw new Error("Drive resumable upload did not return a session location");
    }
    return location;
  }

  private async uploadResumableBytes(sessionUrl: string, bytes: Uint8Array): Promise<DriveFileMetadata> {
    let offset = 0;
    const total = bytes.byteLength;

    while (offset < total) {
      const chunkEndExclusive = Math.min(offset + this.chunkSizeBytes, total);
      const chunk = bytes.slice(offset, chunkEndExclusive);
      const start = offset;
      const end = chunkEndExclusive - 1;

      const response = await withRetry(
        async () => {
          const token = await this.options.getAccessToken();
          const result = await this.fetchImpl(sessionUrl, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Length": String(chunk.byteLength),
              "Content-Range": `bytes ${start}-${end}/${total}`
            },
            body: chunk
          });

          if (result.status === 308 || result.status === 200 || result.status === 201) {
            return result;
          }

          const body = await result.text();
          throw new HttpResponseError("Drive resumable upload chunk failed", result.status, body);
        },
        {
          shouldRetry: (error) => {
            if (isAuthOrTokenError(error)) return false;
            return error instanceof HttpResponseError ? isRetryableStatus(error.status) : true;
          }
        }
      );

      if (response.status === 308) {
        const range = response.headers.get("range");
        if (range) {
          const match = /bytes=0-(\d+)/i.exec(range);
          if (match?.[1]) {
            offset = Number.parseInt(match[1], 10) + 1;
            continue;
          }
        }
        offset = chunkEndExclusive;
        continue;
      }

      const finalMetadata = (await response.json()) as DriveFileMetadata;
      return finalMetadata;
    }

    throw new Error("Drive resumable upload ended unexpectedly without completion metadata");
  }

  private async getOrCreateFolder(name: string, parentId: string): Promise<DriveFolder> {
    const escapedName = escapeDriveQueryLiteral(name);
    const query = encodeURIComponent(
      `mimeType='${FOLDER_MIME_TYPE}' and name='${escapedName}' and trashed=false and '${parentId}' in parents`
    );

    const existingResponse = await this.request(
      `/files?q=${query}&fields=files(id,name)&spaces=drive&pageSize=1`,
      { method: "GET" },
      DRIVE_API_BASE
    );
    const existingPayload = (await existingResponse.json()) as { files?: DriveFolder[] };
    const existingFolder = existingPayload.files?.[0];
    if (existingFolder) {
      return existingFolder;
    }

    const createResponse = await this.request(
      "/files?fields=id,name",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=UTF-8"
        },
        body: JSON.stringify({
          name,
          mimeType: FOLDER_MIME_TYPE,
          parents: [parentId]
        })
      },
      DRIVE_API_BASE
    );
    return (await createResponse.json()) as DriveFolder;
  }

  private async request(path: string, init: RequestInit, base: string): Promise<Response> {
    return withRetry(
      async () => {
        const token = await this.options.getAccessToken();
        const response = await this.fetchImpl(toUrl(path, base), {
          ...init,
          headers: {
            Authorization: `Bearer ${token}`,
            ...(init.headers ?? {})
          }
        });

        if (response.ok) {
          return response;
        }

        const body = await response.text();
        throw new HttpResponseError(`Drive request failed: ${path}`, response.status, body);
      },
      {
        shouldRetry: (error) => {
          if (isAuthOrTokenError(error)) return false;
          return error instanceof HttpResponseError ? isRetryableStatus(error.status) : true;
        }
      }
    );
  }
}
