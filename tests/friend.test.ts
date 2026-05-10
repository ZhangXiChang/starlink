import { expect, test, type Page } from "@playwright/test";
import type { CompiledQuery } from "kysely";
import type { User } from "../src/lib/endpoint/types";
import {
	add_friend,
	save_friend_request,
	validate_friend_search,
} from "../src/lib/friends";
import type { SQLite } from "../src/lib/sqlite/interface";
import { Toaster } from "../src/lib/toaster";

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

async function register_and_login(page: Page, name: string) {
	await page.goto("http://localhost:8787");
	await page.getByRole("radio", { name: "注册" }).check();
	await page.getByRole("textbox", { name: "用户名" }).fill(name);
	await page.getByRole("button", { name: "注册" }).click();
	await page.getByRole("radio", { name: "登录" }).check();
	const account_select = page.getByLabel("账户选择账户");
	await account_select.selectOption({ index: 1 });
	const owner_id = await account_select.inputValue();
	await page.getByRole("button", { name: "登录" }).click();
	await expect(page.getByRole("radio", { name: "登录" })).not.toBeVisible();
	return owner_id;
}

test.describe("好友功能", () => {
	test("添加好友表单会校验空用户和当前用户", async ({ page }) => {
		const owner_id = await register_and_login(
			page,
			`好友测试-${Date.now()}`,
		);

		await page.locator('label[aria-label="好友"]').click();
		await page.getByRole("button", { name: "添加好友" }).click();
		const add_friend_dialog = page.locator("dialog");

		await add_friend_dialog.getByRole("button", { name: "搜索" }).click();
		await expect(add_friend_dialog.getByText("请输入用户ID")).toBeVisible();

		await add_friend_dialog.getByLabel("用户ID").fill(owner_id);
		await add_friend_dialog.getByRole("button", { name: "搜索" }).click();
		await expect(add_friend_dialog.getByText("不能添加自己为好友")).toBeVisible();
	});

	test("普通 toast 会自动关闭，操作 toast 保持到手动关闭", async () => {
		const toaster = new Toaster();

		toaster.popup("你们已经是好友", { type: "info", duration: 20 });
		expect(toaster.toasts().size).toBe(1);
		await expect.poll(() => toaster.toasts().size).toBe(0);

		const close = toaster.popup("好友请求", { duration: null });
		await new Promise((resolve) => setTimeout(resolve, 30));
		expect(toaster.toasts().size).toBe(1);
		close();
		expect(toaster.toasts().size).toBe(0);
	});

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
