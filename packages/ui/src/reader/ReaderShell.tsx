import type { FileType } from "@lumio/core";
import { EpubReader } from "./EpubReader";
import { PdfReader } from "./PdfReader";
import type { ReaderSharedProps } from "./types";

export type ReaderShellProps = ReaderSharedProps & {
  format: FileType;
  title?: string;
};

export function ReaderShell(props: ReaderShellProps) {
  if (props.format === "EPUB") {
    return (
      <EpubReader
        source={props.source}
        title={props.title}
        onProgress={props.onProgress}
        deviceId={props.deviceId}
        initialVersion={props.initialVersion}
      />
    );
  }

  return (
    <PdfReader
      source={props.source}
      title={props.title}
      onProgress={props.onProgress}
      deviceId={props.deviceId}
      initialVersion={props.initialVersion}
    />
  );
}
