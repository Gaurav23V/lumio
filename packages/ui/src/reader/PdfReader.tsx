import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from "pdfjs-dist";
import { ReaderToolbar } from "./ReaderToolbar";
import { useProgressReporter } from "./useProgressReporter";
import type { ReaderProgressEvent, ReaderSharedProps } from "./types";

/** Worker served from app public folder (e.g. /pdf.worker.min.mjs). Apps must copy it from pdfjs-dist/build/ */
GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export type PdfReaderProps = ReaderSharedProps & {
  title?: string;
  initialPageNumber?: number;
  initialZoom?: number;
};

export function PdfReader(props: PdfReaderProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const versionRef = useRef(props.initialVersion ?? 0);
  const hasSkippedInitialEmitRef = useRef(false);
  const suppressNextEmitRef = useRef(false);

  const [pageNumber, setPageNumber] = useState(props.initialPageNumber ?? 1);
  const [zoom, setZoom] = useState(props.initialZoom ?? 1);
  const [pageCount, setPageCount] = useState(1);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [pendingProgress, setPendingProgress] = useState<ReaderProgressEvent<"PDF"> | null>(null);

  const readerTitle = props.title ?? "PDF Reader";

  const emitProgress = useCallback(
    (payload: ReaderProgressEvent<"PDF">) => {
      props.onProgress(payload);
    },
    [props]
  );

  useProgressReporter(pendingProgress, emitProgress, { debounceMs: 750 });

  const clampedPage = useMemo(
    () => Math.max(1, Math.min(pageCount, pageNumber)),
    [pageCount, pageNumber]
  );

  const renderCurrentPage = useCallback(async () => {
    if (!docRef.current || !canvasRef.current) {
      return;
    }
    const page = await docRef.current.getPage(clampedPage);
    const viewport = page.getViewport({ scale: zoom });
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvas, canvasContext: context, viewport }).promise;
  }, [clampedPage, zoom]);

  useEffect(() => {
    let cancelled = false;
    hasSkippedInitialEmitRef.current = false;
    suppressNextEmitRef.current = false;
    async function loadDocument() {
      const loadingTask = getDocument(props.source);
      const doc = await loadingTask.promise;
      if (cancelled) {
        await doc.destroy();
        return;
      }
      docRef.current = doc;
      setPageCount(doc.numPages);
      setPageNumber((current) => Math.max(1, Math.min(doc.numPages, current)));
    }

    loadDocument().catch((error: unknown) => {
      console.error("Failed to load PDF document", error);
    });

    return () => {
      cancelled = true;
      if (docRef.current) {
        void docRef.current.destroy();
      }
      docRef.current = null;
    };
  }, [props.source]);

  useEffect(() => {
    void renderCurrentPage();
  }, [renderCurrentPage]);

  useEffect(() => {
    if (
      typeof props.initialVersion === "number" &&
      Number.isFinite(props.initialVersion) &&
      props.initialVersion > versionRef.current
    ) {
      versionRef.current = props.initialVersion;
    }
  }, [props.initialVersion]);

  useEffect(() => {
    if (
      typeof props.initialPageNumber === "number" &&
      Number.isFinite(props.initialPageNumber) &&
      props.initialPageNumber > 0
    ) {
      suppressNextEmitRef.current = true;
      setPageNumber(Math.floor(props.initialPageNumber));
    }
  }, [props.initialPageNumber]);

  useEffect(() => {
    if (
      typeof props.initialZoom === "number" &&
      Number.isFinite(props.initialZoom) &&
      props.initialZoom > 0
    ) {
      suppressNextEmitRef.current = true;
      setZoom(props.initialZoom);
    }
  }, [props.initialZoom]);

  useEffect(() => {
    if (!hasSkippedInitialEmitRef.current) {
      hasSkippedInitialEmitRef.current = true;
      return;
    }
    if (suppressNextEmitRef.current) {
      suppressNextEmitRef.current = false;
      return;
    }
    versionRef.current += 1;
    setPendingProgress({
      progressType: "PDF",
      payload: { pageNumber: clampedPage, scrollRatio: 0, zoom },
      deviceId: props.deviceId,
      lastReadAt: new Date().toISOString(),
      version: versionRef.current
    });
  }, [clampedPage, zoom, props.deviceId]);

  useEffect(() => {
    if (!searchTerm || !docRef.current) {
      return;
    }
    let cancelled = false;
    async function findMatch() {
      if (!docRef.current) {
        return;
      }
      for (let i = 1; i <= docRef.current.numPages; i += 1) {
        const page = await docRef.current.getPage(i);
        const content = await page.getTextContent();
        const text = content.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ")
          .toLowerCase();
        if (cancelled) {
          return;
        }
        if (text.includes(searchTerm.toLowerCase())) {
          setPageNumber(i);
          return;
        }
      }
    }
    void findMatch();
    return () => {
      cancelled = true;
    };
  }, [searchTerm]);

  return (
    <div style={{ border: "1px solid #d8d8d8", borderRadius: 8, overflow: "hidden" }}>
      <ReaderToolbar
        title={`${readerTitle} (${clampedPage}/${pageCount})`}
        zoom={zoom}
        onZoomIn={() => setZoom((current) => Math.min(4, current + 0.1))}
        onZoomOut={() => setZoom((current) => Math.max(0.2, current - 0.1))}
        onSearch={setSearchTerm}
      />
      <div style={{ display: "flex", justifyContent: "center", padding: 12, overflow: "auto" }}>
        <canvas ref={canvasRef} />
      </div>
      <footer style={{ display: "flex", gap: 8, justifyContent: "center", padding: 8 }}>
        <button type="button" onClick={() => setPageNumber((current) => Math.max(1, current - 1))}>
          Previous
        </button>
        <button
          type="button"
          onClick={() => setPageNumber((current) => Math.min(pageCount, current + 1))}
        >
          Next
        </button>
      </footer>
    </div>
  );
}
