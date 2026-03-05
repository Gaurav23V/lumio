import { describe, expect, it } from "vitest";
import { isMissingBookForeignKeyError } from "@/lib/supabaseErrors";

describe("isMissingBookForeignKeyError", () => {
  it("matches progress->books foreign key violations", () => {
    const err = new Error(
      'insert or update on table "progress" violates foreign key constraint "progress_book_id_fkey"'
    );
    expect(isMissingBookForeignKeyError(err)).toBe(true);
  });

  it("matches generic foreign-key messages that reference books", () => {
    const err = new Error('insert failed: foreign key violation, key missing in table "books"');
    expect(isMissingBookForeignKeyError(err)).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(isMissingBookForeignKeyError(new Error("network timeout"))).toBe(false);
    expect(isMissingBookForeignKeyError(null)).toBe(false);
  });
});
