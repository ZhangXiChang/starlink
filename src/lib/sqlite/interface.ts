import type { CompiledQuery } from "kysely";
import type { Free, Init } from "../interface";
import type { SQLiteUpdateEvent } from "./types";

export interface SQLiteModule extends Init, Free {
  create_sqlite(path: string): Promise<SQLite>;
}

export interface SQLite {
  close(): Promise<void>;
  execute_sql(sql: string): Promise<void>;
  execute(compiled_query: CompiledQuery): Promise<void>;
  query<T>(compiled_query: CompiledQuery): Promise<T[]>;
  on_update(callback: (event: SQLiteUpdateEvent) => void): () => void;
}
