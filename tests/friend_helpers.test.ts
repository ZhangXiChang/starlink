import { expect, test } from "@playwright/test";
import type { CompiledQuery } from "kysely";
import type { User } from "../src/lib/endpoint/types";
import {
	add_friend,
	save_friend_request,
	validate_friend_search,
} from "../src/lib/friends";
import type { SQLite } from "../src/lib/sqlite/interface";

function create_sqlite_stub(query_result: unknown[] = []) {
	const executed: CompiledQuery[] = [];
	const queried: CompiledQuery[] = [];
	const sqlite: SQLite = {
		async close() {},
		async execute_sql() {},
		async execute(query) {
			executed.push(query);
		},
		async query<T>(query: CompiledQuery) {
			queried.push(query);
			return query_result as T[];
		},
		on_update() {
			return () => {};
		},
	};
	return { sqlite, executed, queried };
}

test.describe("friend helpers", () => {
	test("rejects blank friend search ids without querying", async () => {
		const { sqlite, queried } = create_sqlite_stub();

		const result = await validate_friend_search(sqlite, "owner-id", "   ");

		expect(result).toEqual({ ok: false, message: "请输入用户ID" });
		expect(queried).toHaveLength(0);
	});

	test("rejects adding the current user as a friend", async () => {
		const { sqlite, queried } = create_sqlite_stub();

		const result = await validate_friend_search(sqlite, "owner-id", "owner-id");

		expect(result).toEqual({ ok: false, message: "不能添加自己为好友" });
		expect(queried).toHaveLength(0);
	});

	test("rejects an existing friend", async () => {
		const { sqlite } = create_sqlite_stub([{ exists: 1 }]);

		const result = await validate_friend_search(
			sqlite,
			"owner-id",
			"friend-id",
		);

		expect(result).toEqual({ ok: false, message: "你们已经是好友" });
	});

	test("returns a trimmed id when friend search is valid", async () => {
		const { sqlite } = create_sqlite_stub();

		const result = await validate_friend_search(
			sqlite,
			"owner-id",
			" friend-id ",
		);

		expect(result).toEqual({ ok: true, id: "friend-id" });
	});

	test("upserts accepted friends with owner scoped ids", async () => {
		const friend: User = {
			id: "friend-id",
			name: "李四",
			bio: "你好",
		};
		const { sqlite, executed } = create_sqlite_stub();

		await add_friend(sqlite, "owner-id", friend);

		expect(executed).toHaveLength(1);
		expect(executed[0]?.sql).toContain('insert into "friend"');
		expect(executed[0]?.parameters).toEqual([
			"owner-id",
			"friend-id",
			"李四",
			null,
			"你好",
		]);
	});

	test("records responded friend requests with deterministic timestamps", async () => {
		const remote: User = {
			id: "remote-id",
			name: "王五",
			bio: "很高兴认识你",
		};
		const { sqlite, executed } = create_sqlite_stub();

		await save_friend_request(
			sqlite,
			{
				owner_id: "owner-id",
				remote,
				direction: "incoming",
				status: "accepted",
			},
			() => "2026-05-10T00:00:00.000Z",
		);

		expect(executed).toHaveLength(1);
		expect(executed[0]?.sql).toContain('insert into "friend_request"');
		expect(executed[0]?.parameters).toEqual([
			"owner-id",
			"remote-id",
			"incoming",
			"王五",
			null,
			"很高兴认识你",
			"accepted",
			"2026-05-10T00:00:00.000Z",
			"2026-05-10T00:00:00.000Z",
		]);
	});
});
