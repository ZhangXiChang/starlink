import { expose } from "comlink";
import type { CompiledQuery } from "kysely";
import * as sqlite from "wa-sqlite";
import sqlite_esm_factory from "wa-sqlite/dist/wa-sqlite.mjs";
import wasm_url from "wa-sqlite/dist/wa-sqlite.wasm?url";
//@ts-expect-error 导入JS模块
import { OPFSCoopSyncVFS as VFS } from "wa-sqlite/src/examples/OPFSCoopSyncVFS";
import type { Init } from "~/lib/interface";
import type { SQLiteUpdateEvent } from "../types";

export class SQLiteWorker implements Init {
	private api?: SQLiteAPI;

	private get_api() {
		if (!this.api) throw new Error("API不存在");
		return this.api;
	}
	async init() {
		//eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const module = await sqlite_esm_factory({ locateFile: () => wasm_url });
		const sqlite_api = sqlite.Factory(module);
		//eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
		const vfs = await VFS.create("opfs", module);
		//eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		sqlite_api.vfs_register(vfs);
		this.api = sqlite_api;
	}
	async open_db(path: string) {
		return await this.get_api().open_v2(
			path,
			sqlite.SQLITE_OPEN_CREATE | sqlite.SQLITE_OPEN_READWRITE,
			"opfs",
		);
	}
	async close_db(db: number) {
		await this.get_api().close(db);
	}
	async execute_sql(db: number, sql: string) {
		for await (const stmt of this.get_api().statements(db, sql)) {
			await this.get_api().step(stmt);
		}
	}
	async execute(db: number, compiled_query: CompiledQuery) {
		for await (const stmt of this.get_api().statements(
			db,
			compiled_query.sql,
		)) {
			this.get_api().bind_collection(stmt, compiled_query.parameters as []);
			await this.get_api().step(stmt);
		}
	}
	async query(db: number, compiled_query: CompiledQuery) {
		const result: unknown[] = [];
		for await (const stmt of this.get_api().statements(
			db,
			compiled_query.sql,
		)) {
			this.get_api().bind_collection(stmt, compiled_query.parameters as []);
			const column_names = this.get_api().column_names(stmt);
			while ((await this.get_api().step(stmt)) === sqlite.SQLITE_ROW) {
				const object: Record<string, unknown> = {};
				for (let i = 0; i < column_names.length; i++) {
					object[column_names[i]] = structuredClone(
						this.get_api().column(stmt, i),
					);
				}
				result.push(object);
			}
		}
		return result;
	}
	on_update(db: number, callback: (event: SQLiteUpdateEvent) => void) {
		this.get_api().update_hook(
			db,
			(update_type, db_name, table_name, row_id) => {
				callback({ update_type, db_name, table_name, row_id });
			},
		);
	}
}

expose(new SQLiteWorker());
