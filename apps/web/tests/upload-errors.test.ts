import { describe, expect, it } from "vitest";
import { extractDriveErrorMessage } from "@lumio/adapters";

describe("upload error propagation", () => {
  it("extracts actionable message for missing provider token", () => {
    const err = new Error("Google Drive provider token is missing");
    expect(extractDriveErrorMessage(err)).toMatch(/token is missing|Sign out and sign in/i);
  });

  it("propagates Drive API error messages", () => {
    const err = new Error(
      "Drive request failed: /files Insufficient Permission: Request had insufficient authentication scopes. Ensure the app has Drive file access."
    );
    const msg = extractDriveErrorMessage(err);
    expect(msg).toContain("Insufficient Permission");
    expect(msg).toContain("insufficient authentication scopes");
  });

  it("returns generic message for unknown error types", () => {
    expect(extractDriveErrorMessage(null)).toMatch(/Upload failed|try again/i);
    expect(extractDriveErrorMessage(undefined)).toMatch(/Upload failed|try again/i);
  });
});
