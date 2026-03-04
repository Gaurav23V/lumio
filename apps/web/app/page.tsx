"use client";

import type { Book, Folder, ProgressRecord } from "@lumio/core";
import { OfflineQueue, SyncEngine, nowIsoString } from "@lumio/core";
import {
  GoogleDriveAdapter,
  IndexedDbLocalAdapter,
  SupabaseMetadataAdapter
} from "@lumio/adapters";
import { LibraryView, type ReaderProgressEvent } from "@lumio/ui/library";
import dynamic from "next/dynamic";

const ReaderShell = dynamic(
  () => import("@lumio/ui").then((m) => ({ default: m.ReaderShell })),
  { ssr: false }
);
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { sha256Hex } from "@/lib/utils";

function toLibraryBook(book: Book) {
  return {
    bookId: book.bookId,
    title: book.title,
    author: book.author,
    folderId: book.folderId,
    fileType: book.fileType,
    syncStatus: book.syncStatus,
    cacheStatus: book.cacheStatus,
    updatedAt: book.updatedAt
  } as const;
}

function toLibraryFolder(folder: Folder) {
  return {
    folderId: folder.folderId,
    name: folder.name,
    sortOrder: folder.sortOrder,
    deletedAt: folder.deletedAt
  } as const;
}

export default function HomePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("Initializing...");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [activeBookSource, setActiveBookSource] = useState<string | null>(null);

  const supabaseRef = useRef<SupabaseClient | null>(null);
  const localAdapterRef = useRef<IndexedDbLocalAdapter | null>(null);
  const queueRef = useRef<OfflineQueue | null>(null);
  const cloudAdapterRef = useRef<SupabaseMetadataAdapter | null>(null);
  const syncEngineRef = useRef<SyncEngine | null>(null);
  const driveAdapterRef = useRef<GoogleDriveAdapter | null>(null);
  const objectUrlsRef = useRef(new Map<string, string>());

  const activeBook = useMemo(
    () => books.find((book) => book.bookId === activeBookId) ?? null,
    [activeBookId, books]
  );

  const getDriveToken = useCallback((): string | null => {
    if (session?.provider_token) {
      return session.provider_token;
    }
    return window.localStorage.getItem("lumio_google_provider_token");
  }, [session]);

  const hydrateLocal = useCallback(async () => {
    const local = localAdapterRef.current;
    if (!local) {
      return;
    }
    const [nextFolders, nextBooks] = await Promise.all([local.getFolders(), local.getBooks()]);
    setFolders(nextFolders);
    setBooks(nextBooks);
  }, []);

  const runSync = useCallback(async () => {
    const sync = syncEngineRef.current;
    if (!sync) {
      return;
    }
    const summary = await sync.runOnce();
    setStatusMessage(
      `Synced. Pulled F:${summary.pulled.folders} B:${summary.pulled.books} P:${summary.pulled.progress}`
    );
    await hydrateLocal();
  }, [hydrateLocal]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabaseRef.current = supabase;
    let cancelled = false;

    async function bootstrapSession() {
      const { data, error } = await supabase.auth.getSession();
      if (cancelled) {
        return;
      }
      if (error) {
        setSessionError(error.message);
        setStatusMessage("Failed to load auth session");
        return;
      }
      setSession(data.session);
      if (data.session?.provider_token) {
        window.localStorage.setItem("lumio_google_provider_token", data.session.provider_token);
      }
      setStatusMessage(data.session ? "Authenticated" : "Sign in required");
    }

    void bootstrapSession();
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.provider_token) {
        window.localStorage.setItem("lumio_google_provider_token", nextSession.provider_token);
      }
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session || !supabaseRef.current) {
      return;
    }
    const local = new IndexedDbLocalAdapter({ dbName: `lumio-${session.user.id}` });
    const queue = new OfflineQueue(local);
    const cloud = new SupabaseMetadataAdapter(supabaseRef.current, session.user.id);
    const drive = new GoogleDriveAdapter({
      getAccessToken: async () => {
        const token = getDriveToken();
        if (!token) {
          throw new Error("Google Drive provider token is missing");
        }
        return token;
      }
    });
    const sync = new SyncEngine(cloud, local, queue);

    localAdapterRef.current = local;
    queueRef.current = queue;
    cloudAdapterRef.current = cloud;
    driveAdapterRef.current = drive;
    syncEngineRef.current = sync;

    setStatusMessage("Syncing...");
    void runSync();

    const interval = window.setInterval(() => {
      void runSync();
    }, 45_000);

    const onFocus = () => {
      void runSync();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [session, getDriveToken, runSync]);

  async function signInWithGoogle(): Promise<void> {
    const supabase = supabaseRef.current;
    if (!supabase) {
      return;
    }
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          access_type: "offline",
          prompt: "consent"
        }
      }
    });
    if (error) {
      setSessionError(error.message);
    }
  }

  async function signOut(): Promise<void> {
    const supabase = supabaseRef.current;
    if (!supabase) {
      return;
    }
    await supabase.auth.signOut();
    setSession(null);
    setFolders([]);
    setBooks([]);
    setStatusMessage("Signed out");
  }

  async function upsertFolder(folder: Folder): Promise<void> {
    const local = localAdapterRef.current;
    const cloud = cloudAdapterRef.current;
    if (!local || !cloud) {
      return;
    }
    await local.upsertFolders([folder]);
    setFolders((current) => {
      const map = new Map(current.map((item) => [item.folderId, item]));
      map.set(folder.folderId, folder);
      return [...map.values()];
    });
    await cloud.pushFolders([folder]);
  }

  async function upsertBook(book: Book): Promise<void> {
    const local = localAdapterRef.current;
    const cloud = cloudAdapterRef.current;
    if (!local || !cloud) {
      return;
    }
    await local.upsertBooks([book]);
    setBooks((current) => {
      const map = new Map(current.map((item) => [item.bookId, item]));
      map.set(book.bookId, book);
      return [...map.values()];
    });
    await cloud.pushBooks([book]);
  }

  async function handleUpload(files: File[]): Promise<void> {
    const local = localAdapterRef.current;
    const cloud = cloudAdapterRef.current;
    const drive = driveAdapterRef.current;
    if (!local || !cloud || !drive || !session) {
      return;
    }

    for (const file of files) {
      const bookId = crypto.randomUUID();
      const now = nowIsoString();
      const initialBook: Book = {
        bookId,
        userId: session.user.id,
        folderId: null,
        title: file.name.replace(/\.[^.]+$/, ""),
        author: null,
        originalFilename: file.name,
        fileType: file.name.toLowerCase().endsWith(".epub") ? "EPUB" : "PDF",
        fileSizeBytes: file.size,
        contentHash: "pending",
        coverRef: null,
        driveFileId: `local-${bookId}`,
        driveMd5: null,
        syncStatus: "LOCAL_ONLY",
        cacheStatus: "CACHED",
        createdAt: now,
        updatedAt: now,
        deletedAt: null
      };

      await local.upsertBooks([initialBook]);
      setBooks((current) => [...current, initialBook]);
      const localUrl = URL.createObjectURL(file);
      objectUrlsRef.current.set(bookId, localUrl);

      void (async () => {
        try {
          const uploadingBook = { ...initialBook, syncStatus: "UPLOADING" as const, updatedAt: nowIsoString() };
          await local.upsertBooks([uploadingBook]);
          setBooks((current) => current.map((book) => (book.bookId === bookId ? uploadingBook : book)));

          const bytes = new Uint8Array(await file.arrayBuffer());
          const hash = await sha256Hex(bytes);
          const uploadResult = await drive.uploadBook({
            bookId,
            filename: file.name,
            mimeType: file.type || (file.name.endsWith(".epub") ? "application/epub+zip" : "application/pdf"),
            bytes
          });

          const syncedBook: Book = {
            ...uploadingBook,
            contentHash: hash,
            driveFileId: uploadResult.driveFileId,
            driveMd5: uploadResult.md5,
            syncStatus: "SYNCED",
            updatedAt: nowIsoString()
          };
          await local.upsertBooks([syncedBook]);
          await cloud.pushBooks([syncedBook]);
          setBooks((current) => current.map((book) => (book.bookId === bookId ? syncedBook : book)));
          setStatusMessage(`Uploaded ${file.name}`);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Upload failed";
          setStatusMessage(`Upload failed: ${message}`);
          setBooks((current) =>
            current.map((book) =>
              book.bookId === bookId
                ? { ...book, syncStatus: "ERROR", updatedAt: nowIsoString() }
                : book
            )
          );
        }
      })();
    }
  }

  async function handleOpenBook(bookId: string): Promise<void> {
    const existing = objectUrlsRef.current.get(bookId);
    if (existing) {
      setActiveBookId(bookId);
      setActiveBookSource(existing);
      return;
    }

    const book = books.find((item) => item.bookId === bookId);
    const drive = driveAdapterRef.current;
    if (!book || !drive) {
      return;
    }

    try {
      const bytes = await drive.downloadBook(book.driveFileId);
      const mimeType = book.fileType === "EPUB" ? "application/epub+zip" : "application/pdf";
      const blob = new Blob([new Uint8Array(bytes)], { type: mimeType });
      const objectUrl = URL.createObjectURL(blob);
      objectUrlsRef.current.set(bookId, objectUrl);
      setActiveBookId(bookId);
      setActiveBookSource(objectUrl);
      setStatusMessage(`Opened ${book.title}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown open error";
      setStatusMessage(`Failed to open book: ${message}`);
    }
  }

  async function handleProgress(event: ReaderProgressEvent): Promise<void> {
    if (!session || !activeBookId) {
      return;
    }
    const local = localAdapterRef.current;
    const cloud = cloudAdapterRef.current;
    const queue = queueRef.current;
    if (!local || !cloud || !queue) {
      return;
    }

    const record: ProgressRecord = {
      bookId: activeBookId,
      userId: session.user.id,
      progressType: event.progressType,
      payload: event.payload,
      version: event.version,
      lastReadAt: event.lastReadAt,
      deviceId: event.deviceId,
      updatedAt: nowIsoString()
    };

    await local.upsertProgress([record]);
    try {
      await cloud.pushProgress([record]);
    } catch (error) {
      await queue.enqueue({
        operationId: crypto.randomUUID(),
        operationType: "UPDATE_PROGRESS",
        payload: record
      });
      const message = error instanceof Error ? error.message : "queued progress after sync failure";
      setStatusMessage(`Progress queued: ${message}`);
    }
  }

  useEffect(() => {
    return () => {
      for (const [, url] of objectUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
      objectUrlsRef.current.clear();
    };
  }, []);

  if (!session) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 720, margin: "0 auto" }}>
        <h1>Lumio</h1>
        <p>Sign in with Google to access your Drive-backed library.</p>
        <button type="button" onClick={() => void signInWithGoogle()}>
          Continue with Google
        </button>
        {sessionError ? <p style={{ color: "#b42318" }}>{sessionError}</p> : null}
        <p style={{ color: "#555", marginTop: 16 }}>{statusMessage}</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 16, display: "grid", gap: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0 }}>Lumio</h1>
          <small style={{ color: "#555" }}>{statusMessage}</small>
        </div>
        <button type="button" onClick={() => void signOut()}>
          Sign out
        </button>
      </header>

      <LibraryView
        folders={folders.map(toLibraryFolder)}
        books={books.filter((book) => book.deletedAt === null).map(toLibraryBook)}
        onOpenBook={(bookId) => void handleOpenBook(bookId)}
        onMoveBook={(bookId, folderId) => {
          const next = books.find((book) => book.bookId === bookId);
          if (!next) {
            return;
          }
          void upsertBook({ ...next, folderId, updatedAt: nowIsoString() });
        }}
        onCreateFolder={(name) =>
          void upsertFolder({
            folderId: crypto.randomUUID(),
            userId: session.user.id,
            name,
            sortOrder: folders.length,
            createdAt: nowIsoString(),
            updatedAt: nowIsoString(),
            deletedAt: null
          })
        }
        onRenameFolder={(folderId, name) => {
          const folder = folders.find((item) => item.folderId === folderId);
          if (!folder) {
            return;
          }
          void upsertFolder({ ...folder, name, updatedAt: nowIsoString() });
        }}
        onDeleteFolder={(folderId) => {
          const folder = folders.find((item) => item.folderId === folderId);
          if (!folder) {
            return;
          }
          void upsertFolder({ ...folder, deletedAt: nowIsoString(), updatedAt: nowIsoString() });
        }}
        onDeleteBook={(bookId) =>
          void (async () => {
            const local = localAdapterRef.current;
            const cloud = cloudAdapterRef.current;
            if (!local || !cloud) {
              return;
            }
            await local.deleteBooks([bookId]);
            await cloud.deleteBooks([bookId]);
            setBooks((current) => current.filter((item) => item.bookId !== bookId));
          })()
        }
        onUploadFiles={(files) => void handleUpload(files)}
      />

      {activeBook && activeBookSource ? (
        <section>
          <h2 style={{ marginBottom: 8 }}>Reading: {activeBook.title}</h2>
          <ReaderShell
            format={activeBook.fileType}
            source={activeBookSource}
            deviceId={"web-browser"}
            initialVersion={0}
            title={activeBook.title}
            onProgress={(event) => void handleProgress(event)}
          />
        </section>
      ) : null}
    </main>
  );
}
