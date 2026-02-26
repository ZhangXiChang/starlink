import { EndpointModuleAdapter } from "~/lib/endpoint";
import type { EndpointModule } from "~/lib/endpoint/interface";
import { SQLiteModuleAdapter } from "~/lib/sqlite";
import type { SQLite, SQLiteModule } from "~/lib/sqlite/interface";
import type { Store } from "./interface";
import { Toaster } from "~/lib/toast";

export class MainStore implements Store {
  sqlite_module: SQLiteModule;
  endpoint_module: EndpointModule;
  sqlite: SQLite;
  toaster: Toaster;

  private constructor(
    sqlite_module: SQLiteModule,
    endpoint_module: EndpointModule,
    sqlite: SQLite,
    toaster: Toaster,
  ) {
    this.sqlite_module = sqlite_module;
    this.endpoint_module = endpoint_module;
    this.sqlite = sqlite;
    this.toaster = toaster;
  }
  static async new() {
    const sqlite_module = new SQLiteModuleAdapter();
    await sqlite_module.init();
    const sqlite = await sqlite_module.create_sqlite("data.db");
    await sqlite.execute_sql(await (await fetch("/db_schema.sql")).text());
    const endpoint_module = new EndpointModuleAdapter();
    await endpoint_module.init();
    return new MainStore(sqlite_module, endpoint_module, sqlite, new Toaster());
  }
  async cleanup() {
    await this.sqlite.close();
    await this.sqlite_module.free();
  }
}
