import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LibraryView } from "./LibraryView";

describe("LibraryView", () => {
  it("creates a new folder from input action", () => {
    const onCreateFolder = vi.fn();
    render(
      <LibraryView
        folders={[]}
        books={[]}
        onOpenBook={vi.fn()}
        onMoveBook={vi.fn()}
        onCreateFolder={onCreateFolder}
        onRenameFolder={vi.fn()}
        onDeleteFolder={vi.fn()}
        onDeleteBook={vi.fn()}
        onUploadFiles={vi.fn()}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("Create folder"), {
      target: { value: "Research" }
    });
    fireEvent.click(screen.getByText("Add Folder"));

    expect(onCreateFolder).toHaveBeenCalledWith("Research");
  });

  it("opens a selected book", () => {
    const onOpenBook = vi.fn();
    render(
      <LibraryView
        folders={[]}
        books={[
          {
            bookId: "book-1",
            title: "Systems Book",
            author: null,
            folderId: null,
            fileType: "PDF",
            syncStatus: "SYNCED",
            cacheStatus: "CACHED",
            updatedAt: "2026-01-01T00:00:00.000Z"
          }
        ]}
        onOpenBook={onOpenBook}
        onMoveBook={vi.fn()}
        onCreateFolder={vi.fn()}
        onRenameFolder={vi.fn()}
        onDeleteFolder={vi.fn()}
        onDeleteBook={vi.fn()}
        onUploadFiles={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText("Open"));
    expect(onOpenBook).toHaveBeenCalledWith("book-1");
  });
});
