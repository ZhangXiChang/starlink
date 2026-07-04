import {
  DummyDriver,
  Kysely,
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
} from "kysely";
import type { DB } from "~/generated/db_schema";

export const QueryBuilder = new Kysely<DB>({
  dialect: {
    createDriver: () => new DummyDriver(),
    createQueryCompiler: () => new SqliteQueryCompiler(),
    createAdapter: () => new SqliteAdapter(),
    createIntrospector: (db) => new SqliteIntrospector(db),
  },
});
