import { proxy, type Remote, wrap } from "comlink";
import type { CompiledQuery } from "kysely";
import type { SQLite, SQLiteModule } from "./interface";
import type { SQLiteUpdateEvent } from "./types";
import type { SQLiteWorker } from "./web/worker";
import Worker from "./web/worker?worker";

export class SQLiteModuleImpl implements SQLiteModule {
	private worker?: Worker;
	private api?: Remote<SQLiteWorker>;

	private get_api() {
		if (!this.api) throw new Error("API不存在");
		return this.api;
	}
	async init() {
		const worker = new Worker();
		const api = wrap<SQLiteWorker>(worker);
		await api.init();
		this.worker = worker;
		this.api = api;
	}
	free() {
		this.worker?.terminate();
	}
	async create_sqlite(path: string) {
		const db = await this.get_api().open_db(path);
		return await SQLiteImpl.new(this.get_api(), db);
	}
}

export class SQLiteImpl implements SQLite {
	private api;
	private id;
	private on_updates;

	private constructor(
		api: Remote<SQLiteWorker>,
		id: number,
		on_updates: ((event: SQLiteUpdateEvent) => void)[],
	) {
		this.api = api;
		this.id = id;
		this.on_updates = on_updates;
	}
	static async new(api: Remote<SQLiteWorker>, id: number) {
		const on_updates: ((event: SQLiteUpdateEvent) => void)[] = [];
		await api.on_update(
			id,
			proxy((e) => on_updates.forEach((f) => f(e))),
		);
		return new SQLiteImpl(api, id, on_updates);
	}
	async close() {
		await this.api.close_db(this.id);
	}
	async execute_sql(sql: string) {
		await this.api.execute_sql(this.id, sql);
	}
	async execute(compiled_query: CompiledQuery) {
		await this.api.execute(this.id, compiled_query);
	}
	async query<T>(compiled_query: CompiledQuery) {
		return (await this.api.query(this.id, compiled_query)) as T[];
	}
	on_update(callback: (event: SQLiteUpdateEvent) => void) {
		this.on_updates.push(callback);
		return () => {
			this.on_updates.splice(this.on_updates.indexOf(callback), 1);
		};
	}
}
