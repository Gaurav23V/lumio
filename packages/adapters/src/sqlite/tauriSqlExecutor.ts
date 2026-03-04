import Database from "@tauri-apps/plugin-sql";
import type { SqlExecutor } from "./sqliteLocalAdapter";

export async function createTauriSqlExecutor(connection = "sqlite:lumio.db"): Promise<SqlExecutor> {
  const db = await Database.load(connection);
  return {
    async execute(sql: string, bindValues?: unknown[]): Promise<unknown> {
      return db.execute(sql, bindValues ?? []);
    },
    async select<T = unknown>(sql: string, bindValues?: unknown[]): Promise<T[]> {
      return db.select<T[]>(sql, bindValues ?? []);
    }
  };
}
