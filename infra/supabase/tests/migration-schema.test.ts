import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(import.meta.dirname, "../migrations/0001_initial_schema.sql");
const sql = readFileSync(migrationPath, "utf8");

describe("supabase migration schema", () => {
  it("defines required tables", () => {
    expect(sql).toMatch(/create table if not exists public\.folders/i);
    expect(sql).toMatch(/create table if not exists public\.books/i);
    expect(sql).toMatch(/create table if not exists public\.progress/i);
    expect(sql).toMatch(/create table if not exists public\.sync_events/i);
  });

  it("enables row level security on all user tables", () => {
    expect(sql).toMatch(/alter table public\.folders enable row level security/i);
    expect(sql).toMatch(/alter table public\.books enable row level security/i);
    expect(sql).toMatch(/alter table public\.progress enable row level security/i);
    expect(sql).toMatch(/alter table public\.sync_events enable row level security/i);
  });

  it("creates authenticated policies with auth.uid checks", () => {
    expect(sql).toMatch(/to authenticated/i);
    expect(sql).toMatch(/\(select auth\.uid\(\)\) is not null/i);
    expect(sql).toMatch(/\(select auth\.uid\(\)\) = user_id/i);
  });

  it("creates core performance indexes", () => {
    expect(sql).toMatch(/idx_books_user_updated_at/i);
    expect(sql).toMatch(/idx_progress_user_last_read_at/i);
    expect(sql).toMatch(/idx_folders_user_updated_at/i);
  });
});
