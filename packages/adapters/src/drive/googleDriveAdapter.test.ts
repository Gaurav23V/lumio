import { describe, expect, it } from "vitest";
import { GoogleDriveAdapter } from "./googleDriveAdapter";

function jsonResponse(payload: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init
  });
}

describe("GoogleDriveAdapter", () => {
  it("creates folders and uploads via resumable session", async () => {
    const calls: string[] = [];
    const fetchMock: typeof fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      void init;
      calls.push(url);
      const decodedUrl = decodeURIComponent(url);

      if (decodedUrl.includes("q=") && decodedUrl.includes("name='Lumio'")) {
        return jsonResponse({ files: [] });
      }
      if (decodedUrl.includes("q=") && decodedUrl.includes("name='books'")) {
        return jsonResponse({ files: [] });
      }
      if (url.includes("/drive/v3/files?fields=id,name")) {
        if (calls.filter((item) => item.includes("/drive/v3/files?fields=id,name")).length === 1) {
          return jsonResponse({ id: "folder-app", name: "Lumio" });
        }
        return jsonResponse({ id: "folder-books", name: "books" });
      }
      if (url.includes("/upload/drive/v3/files?uploadType=resumable")) {
        return jsonResponse(
          {},
          {
            status: 200,
            headers: { location: "https://upload-session.example.com/123" }
          }
        );
      }
      if (url === "https://upload-session.example.com/123") {
        return jsonResponse({ id: "drive-file-1", md5Checksum: "abc123" }, { status: 200 });
      }
      throw new Error(`Unexpected fetch call: ${url}`);
    }) as typeof fetch;

    const adapter = new GoogleDriveAdapter({
      getAccessToken: async () => "token-1",
      fetchImpl: fetchMock
    });

    const result = await adapter.uploadBook({
      bookId: "018f4fca-56a0-7b8a-9eea-1258356b2301",
      filename: "example.pdf",
      mimeType: "application/pdf",
      bytes: new Uint8Array([1, 2, 3, 4])
    });

    expect(result).toEqual({ driveFileId: "drive-file-1", md5: "abc123" });
    expect(calls.some((item) => item.includes("uploadType=resumable"))).toBe(true);
  });

  it("downloads file bytes from Drive", async () => {
    const fetchMock: typeof fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (!url.includes("alt=media")) {
        throw new Error(`Unexpected URL: ${url}`);
      }
      return new Response(new Uint8Array([10, 20, 30]));
    }) as typeof fetch;

    const adapter = new GoogleDriveAdapter({
      getAccessToken: async () => "token-1",
      fetchImpl: fetchMock
    });
    const bytes = await adapter.downloadBook("drive-file-id");
    expect([...bytes]).toEqual([10, 20, 30]);
  });
});
