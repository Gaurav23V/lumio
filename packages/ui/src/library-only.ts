/**
 * Library-only entry point. Use this to avoid loading PdfReader/EpubReader (pdfjs/epubjs)
 * during SSR, which require browser APIs like DOMMatrix.
 */
export { LibraryView } from "./library/LibraryView";
export type { LibraryBookItem, LibraryFolderItem } from "./library/types";
export type { ReaderProgressEvent } from "./reader/types";
