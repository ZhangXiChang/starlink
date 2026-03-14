import { EndpointModuleAdapter } from "~/lib/endpoint";
import type { EndpointModule } from "~/lib/endpoint/interface";
import { SQLiteModuleAdapter } from "~/lib/sqlite";
import type { SQLite, SQLiteModule } from "~/lib/sqlite/interface";

export class MainStore {
  sqlite_module: SQLiteModule;
  endpoint_module: EndpointModule;
  sqlite: SQLite;

  private constructor(
    sqlite_module: SQLiteModule,
    endpoint_module: EndpointModule,
    sqlite: SQLite,
  ) {
    this.sqlite_module = sqlite_module;
    this.endpoint_module = endpoint_module;
    this.sqlite = sqlite;
  }
  static async new() {
    const sqlite_module = new SQLiteModuleAdapter();
    await sqlite_module.init();
    const sqlite = await sqlite_module.create_sqlite("data.db");
    await sqlite.execute_sql(await (await fetch("/db_schema.sql")).text());
    const endpoint_module = new EndpointModuleAdapter();
    await endpoint_module.init();
    return new MainStore(sqlite_module, endpoint_module, sqlite);
  }
  async cleanup() {
    await this.sqlite.close();
    await this.sqlite_module.free();
  }
}
