import { describe, expect, it } from "vitest";
import { GoogleDriveAdapter, SupabaseMetadataAdapter } from "./index";

describe("adapters bootstrap", () => {
  it("exports main adapter classes", () => {
    expect(typeof GoogleDriveAdapter).toBe("function");
    expect(typeof SupabaseMetadataAdapter).toBe("function");
  });
});
