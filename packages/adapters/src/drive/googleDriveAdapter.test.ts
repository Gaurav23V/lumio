import { describe, expect, it } from "vitest";
import {
  extractDriveErrorMessage,
  GoogleDriveAdapter,
  parseDriveApiError
} from "./googleDriveAdapter";

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

  it("uses default global fetch without losing Window/global context", async () => {
    const originalFetch = globalThis.fetch;
    let seenThis: unknown = null;
    const fetchMock: typeof fetch = (async function (
      this: unknown,
      input: RequestInfo | URL,
      init?: RequestInit
    ) {
      seenThis = this;
      const url = String(input);
      void init;
      if (!url.includes("alt=media")) {
        return new Response("unexpected url", { status: 500 });
      }
      return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
    }) as typeof fetch;
    globalThis.fetch = fetchMock;

    try {
      const adapter = new GoogleDriveAdapter({
        getAccessToken: async () => "token-1"
      });
      const bytes = await adapter.downloadBook("drive-file-id");
      expect([...bytes]).toEqual([1, 2, 3]);
      expect(seenThis).toBe(globalThis);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("throws with actionable message on 401", async () => {
    const fetchMock: typeof fetch = (async () =>
      new Response(
        JSON.stringify({
          error: { code: 401, message: "Invalid Credentials" }
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      )) as typeof fetch;

    const adapter = new GoogleDriveAdapter({
      getAccessToken: async () => "token-1",
      fetchImpl: fetchMock
    });

    await expect(adapter.downloadBook("any-id")).rejects.toThrow(/Invalid Credentials|refresh your token/i);
  });

  it("throws with actionable message on 403 insufficient scope", async () => {
    const fetchMock: typeof fetch = (async () =>
      new Response(
        JSON.stringify({
          error: {
            code: 403,
            message: "Insufficient Permission: Request had insufficient authentication scopes."
          }
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      )) as typeof fetch;

    const adapter = new GoogleDriveAdapter({
      getAccessToken: async () => "token-1",
      fetchImpl: fetchMock
    });

    await expect(adapter.downloadBook("any-id")).rejects.toThrow(/insufficient|scope|Sign out/i);
  });

  it("throws with actionable message when getAccessToken fails", async () => {
    const fetchMock: typeof fetch = (async () => new Response("ok")) as typeof fetch;
    const adapter = new GoogleDriveAdapter({
      getAccessToken: async () => {
        throw new Error("Google Drive provider token is missing");
      },
      fetchImpl: fetchMock
    });

    await expect(adapter.downloadBook("any-id")).rejects.toThrow(/provider token is missing/i);
  });
});

describe("parseDriveApiError", () => {
  it("extracts message from Drive API JSON", () => {
    const body = JSON.stringify({
      error: { code: 403, message: "Insufficient Permission: Request had insufficient authentication scopes." }
    });
    expect(parseDriveApiError(body, 403)).toMatch(/insufficient|scope/i);
  });

  it("adds sign-out hint for 401", () => {
    const body = JSON.stringify({ error: { message: "Invalid Credentials" } });
    expect(parseDriveApiError(body, 401)).toMatch(/Sign out and sign in/i);
  });

  it("adds scope hint for 403 permission errors", () => {
    const body = JSON.stringify({
      error: { message: "Insufficient Permission: Request had insufficient authentication scopes." }
    });
    expect(parseDriveApiError(body, 403)).toMatch(/Sign out and sign in|grant scope/i);
  });

  it("falls back to status-based message for non-JSON body", () => {
    expect(parseDriveApiError("not json", 401)).toMatch(/authentication failed|Sign out/i);
    expect(parseDriveApiError("not json", 403)).toMatch(/access denied|scope/i);
  });
});

describe("extractDriveErrorMessage", () => {
  it("returns token message for provider token errors", () => {
    expect(extractDriveErrorMessage(new Error("Google Drive provider token is missing"))).toMatch(
      /token is missing|Sign out and sign in/i
    );
  });

  it("returns error message for other Error instances", () => {
    const msg = "Insufficient Permission: Request had insufficient authentication scopes.";
    expect(extractDriveErrorMessage(new Error(msg))).toBe(msg);
  });

  it("returns generic message for non-Error", () => {
    expect(extractDriveErrorMessage("string")).toMatch(/Upload failed|try again/i);
  });
});
