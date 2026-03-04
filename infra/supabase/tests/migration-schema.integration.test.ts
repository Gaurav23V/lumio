import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(import.meta.dirname, "../migrations/0001_initial_schema.sql");
const sql = readFileSync(migrationPath, "utf8");

describe("supabase migration integration checks", () => {
  it("includes updated_at trigger wiring for mutable tables", () => {
    expect(sql).toMatch(/create trigger trg_folders_updated_at/i);
    expect(sql).toMatch(/create trigger trg_books_updated_at/i);
    expect(sql).toMatch(/create trigger trg_progress_updated_at/i);
    expect(sql).toMatch(/execute function public\.set_updated_at\(\)/i);
  });

  it("enforces file and progress type constraints", () => {
    expect(sql).toMatch(/file_type in \('PDF', 'EPUB'\)/i);
    expect(sql).toMatch(/progress_type in \('PDF', 'EPUB'\)/i);
  });
});
