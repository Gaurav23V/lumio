import { useMemo, useState, type CSSProperties, type ChangeEvent, type DragEvent } from "react";
import type { LibraryBookItem, LibraryFolderItem } from "./types";

export type LibraryViewProps = {
  folders: LibraryFolderItem[];
  books: LibraryBookItem[];
  onOpenBook: (bookId: string) => void;
  onMoveBook: (bookId: string, folderId: string | null) => void;
  onCreateFolder: (name: string) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onDeleteBook: (bookId: string) => void;
  onUploadFiles: (files: File[]) => void;
};

const cardStyle: CSSProperties = {
  border: "1px solid #d8d8d8",
  borderRadius: 8,
  padding: 12,
  marginBottom: 12
};

const dropZoneStyle: CSSProperties = {
  border: "1px dashed #bbb",
  borderRadius: 8,
  padding: 10,
  marginBottom: 8
};

function SyncBadge({ status }: { status: LibraryBookItem["syncStatus"] }) {
  const color = status === "ERROR" ? "#d11a2a" : status === "UPLOADING" ? "#9a6700" : "#107a1f";
  return (
    <span style={{ color, fontSize: 12, fontWeight: 600, textTransform: "uppercase" }}>{status}</span>
  );
}

export function LibraryView(props: LibraryViewProps) {
  const [newFolderName, setNewFolderName] = useState("");
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const visibleFolders = useMemo(
    () => props.folders.filter((item) => item.deletedAt === null).sort((a, b) => a.sortOrder - b.sortOrder),
    [props.folders]
  );

  const booksByFolder = useMemo(() => {
    const grouped = new Map<string | null, LibraryBookItem[]>();
    for (const book of props.books) {
      const current = grouped.get(book.folderId) ?? [];
      current.push(book);
      grouped.set(book.folderId, current);
    }
    return grouped;
  }, [props.books]);

  function handleDrop(event: DragEvent<HTMLDivElement>, folderId: string | null): void {
    event.preventDefault();
    const bookId = event.dataTransfer.getData("text/lumio-book-id");
    if (!bookId) {
      return;
    }
    props.onMoveBook(bookId, folderId);
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>): void {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }
    props.onUploadFiles(Array.from(files));
    event.currentTarget.value = "";
  }

  return (
    <section style={{ fontFamily: "system-ui, sans-serif", maxWidth: 960, margin: "0 auto" }}>
      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Library</h2>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            placeholder="Create folder"
            value={newFolderName}
            onChange={(event) => setNewFolderName(event.target.value)}
            style={{ flex: 1, padding: "8px 10px" }}
          />
          <button
            type="button"
            onClick={() => {
              const name = newFolderName.trim();
              if (!name) {
                return;
              }
              props.onCreateFolder(name);
              setNewFolderName("");
            }}
          >
            Add Folder
          </button>
        </div>
        <label style={{ display: "inline-block" }}>
          <input type="file" accept=".pdf,.epub" multiple onChange={handleFileInput} />
        </label>
      </div>

      <div
        style={dropZoneStyle}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => handleDrop(event, null)}
      >
        <h3 style={{ marginTop: 0 }}>Unsorted</h3>
        <BookList
          books={booksByFolder.get(null) ?? []}
          onOpenBook={props.onOpenBook}
          onDeleteBook={props.onDeleteBook}
        />
      </div>

      {visibleFolders.map((folder) => (
        <div
          key={folder.folderId}
          style={dropZoneStyle}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => handleDrop(event, folder.folderId)}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
            {renameTarget === folder.folderId ? (
              <>
                <input
                  value={renameValue}
                  onChange={(event) => setRenameValue(event.target.value)}
                  style={{ flex: 1, padding: "6px 8px" }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const name = renameValue.trim();
                    if (!name) {
                      return;
                    }
                    props.onRenameFolder(folder.folderId, name);
                    setRenameTarget(null);
                    setRenameValue("");
                  }}
                >
                  Save
                </button>
                <button type="button" onClick={() => setRenameTarget(null)}>
                  Cancel
                </button>
              </>
            ) : (
              <>
                <h3 style={{ marginTop: 0, marginBottom: 0 }}>{folder.name}</h3>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setRenameTarget(folder.folderId);
                      setRenameValue(folder.name);
                    }}
                  >
                    Rename
                  </button>
                  <button type="button" onClick={() => props.onDeleteFolder(folder.folderId)}>
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
          <BookList
            books={booksByFolder.get(folder.folderId) ?? []}
            onOpenBook={props.onOpenBook}
            onDeleteBook={props.onDeleteBook}
          />
        </div>
      ))}
    </section>
  );
}

function BookList(props: {
  books: LibraryBookItem[];
  onOpenBook: (bookId: string) => void;
  onDeleteBook: (bookId: string) => void;
}) {
  if (props.books.length === 0) {
    return <p style={{ margin: 0, color: "#666" }}>No books</p>;
  }

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0 0", display: "grid", gap: 8 }}>
      {props.books.map((book) => (
        <li
          key={book.bookId}
          draggable
          onDragStart={(event) => event.dataTransfer.setData("text/lumio-book-id", book.bookId)}
          style={{ border: "1px solid #e2e2e2", borderRadius: 8, padding: 10 }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <div>
              <strong>{book.title}</strong>
              <div style={{ fontSize: 12, color: "#555" }}>{book.author ?? "Unknown author"}</div>
              <div style={{ fontSize: 12, color: "#888" }}>{book.fileType}</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <SyncBadge status={book.syncStatus} />
              <button type="button" onClick={() => props.onOpenBook(book.bookId)}>
                Open
              </button>
              <button type="button" onClick={() => props.onDeleteBook(book.bookId)}>
                Delete
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
