import type { EpubProgressPayload, PdfProgressPayload, ProgressType } from "@lumio/core";

export type ReaderProgressPayloadByType = {
  PDF: PdfProgressPayload;
  EPUB: EpubProgressPayload;
};

export type ReaderProgressEvent<T extends ProgressType = ProgressType> = {
  progressType: T;
  payload: ReaderProgressPayloadByType[T];
  lastReadAt: string;
  version: number;
  deviceId: string;
};

export type ReaderSharedProps = {
  source: string;
  deviceId: string;
  initialVersion?: number;
  initialEpubCfi?: string;
  initialPdfPageNumber?: number;
  initialPdfZoom?: number;
  onProgress: (event: ReaderProgressEvent) => void;
};
