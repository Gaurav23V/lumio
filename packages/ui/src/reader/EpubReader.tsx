import { useEffect, useRef, useState } from "react";
import ePub from "epubjs";
import { ReaderToolbar } from "./ReaderToolbar";
import { useProgressReporter } from "./useProgressReporter";
import type { ReaderProgressEvent, ReaderSharedProps } from "./types";

export type EpubReaderProps = ReaderSharedProps & {
  title?: string;
};

export function EpubReader(props: EpubReaderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const renditionRef = useRef<{
    display: (target?: string) => Promise<void>;
    on: (event: "relocated", callback: (location: { start: { cfi?: string }; percentage?: number }) => void) => void;
    destroy: () => void;
    themes: { default: (styles: Record<string, string>) => void };
    next?: () => Promise<void>;
    prev?: () => Promise<void>;
  } | null>(null);
  const bookRef = useRef<{ destroy: () => void } | null>(null);
  const versionRef = useRef(props.initialVersion ?? 0);

  const [zoom, setZoom] = useState(1);
  const [pendingProgress, setPendingProgress] = useState<ReaderProgressEvent<"EPUB"> | null>(null);

  useProgressReporter(pendingProgress, props.onProgress, { debounceMs: 750 });

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    const book = ePub(props.source);
    const rendition = book.renderTo(containerRef.current, {
      width: "100%",
      height: "80vh",
      flow: "paginated"
    });
    renditionRef.current = rendition;
    bookRef.current = book;

    rendition.on("relocated", (location) => {
      versionRef.current += 1;
      setPendingProgress({
        progressType: "EPUB",
        payload: {
          cfi: location.start.cfi ?? "",
          tocHref: null,
          percent: location.percentage ?? null
        },
        lastReadAt: new Date().toISOString(),
        version: versionRef.current,
        deviceId: props.deviceId
      });
    });

    void rendition.display();

    return () => {
      rendition.destroy();
      book.destroy();
      renditionRef.current = null;
      bookRef.current = null;
    };
  }, [props.source, props.deviceId, props.initialVersion]);

  useEffect(() => {
    if (!renditionRef.current) {
      return;
    }
    renditionRef.current.themes.default({
      body: `font-size: ${Math.round(100 * zoom)}%;`
    });
  }, [zoom]);

  return (
    <div style={{ border: "1px solid #d8d8d8", borderRadius: 8, overflow: "hidden" }}>
      <ReaderToolbar
        title={props.title ?? "EPUB Reader"}
        zoom={zoom}
        onZoomIn={() => setZoom((current) => Math.min(2.5, current + 0.1))}
        onZoomOut={() => setZoom((current) => Math.max(0.5, current - 0.1))}
        onSearch={() => {
          // EPUB full-text search can vary by rendition implementation.
        }}
      />
      <div ref={containerRef} style={{ minHeight: 600, padding: 8 }} />
      <footer style={{ display: "flex", gap: 8, justifyContent: "center", padding: 8 }}>
        <button type="button" onClick={() => void renditionRef.current?.prev?.()}>
          Previous
        </button>
        <button type="button" onClick={() => void renditionRef.current?.next?.()}>
          Next
        </button>
      </footer>
    </div>
  );
}
