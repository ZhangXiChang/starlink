import { expect, type Locator, type Page, test } from "@playwright/test";

const APP_URL = "http://localhost:8787";

async function select_account(page: Page, name: string) {
	const account_select = page.getByLabel("账户选择账户");
	await expect
		.poll(async () => await account_select.locator("option").allTextContents())
		.toContain(name);
	await account_select.selectOption({ label: name });
	return await account_select.inputValue();
}

async function register_user(page: Page, name: string) {
	await page.goto(APP_URL);
	await page.getByRole("radio", { name: "注册" }).check();
	await page.getByRole("textbox", { name: "用户名" }).fill(name);
	await page.getByRole("button", { name: "注册" }).click();
	await page.getByRole("radio", { name: "登录" }).check();
	return await select_account(page, name);
}

async function login_as(page: Page, name: string) {
	await page.goto(APP_URL);
	await page.getByRole("radio", { name: "登录" }).check();
	await select_account(page, name);
	await page.getByRole("button", { name: "登录" }).click();
	await expect(page.getByRole("radio", { name: "登录" })).not.toBeVisible();
}

async function open_friend_list(page: Page) {
	await page.locator('label[aria-label="好友"]').click();
	await expect(page.getByRole("button", { name: "添加好友" })).toBeVisible();
}

async function search_user_until_found(
	page: Page,
	add_friend_dialog: Locator,
	user_id: string,
	name: string,
) {
	await add_friend_dialog.getByLabel("用户ID").fill(user_id);
	const deadline = Date.now() + 30_000;
	let last_message = "";
	while (Date.now() < deadline) {
		await add_friend_dialog.getByRole("button", { name: "搜索" }).click();
		try {
			await expect(add_friend_dialog.getByText("已找到用户")).toBeVisible({
				timeout: 1500,
			});
			await expect(add_friend_dialog.getByText(name)).toBeVisible();
			return;
		} catch {}
		const alert = add_friend_dialog.getByRole("alert");
		if (await alert.isVisible().catch(() => false)) {
			last_message = (await alert.textContent())?.trim() ?? "";
			if (
				last_message !== "" &&
				!last_message.includes("No addressing information available")
			) {
				throw new Error(last_message);
			}
		}
		await page.waitForTimeout(500);
	}
	throw new Error(
		`未能搜索到用户 ${name}${last_message ? `：${last_message}` : ""}`,
	);
}

async function become_friends(
	sender_page: Page,
	receiver_page: Page,
	receiver_id: string,
	sender_name: string,
	receiver_name: string,
) {
	await open_friend_list(receiver_page);
	await expect(receiver_page.getByText("暂无好友")).toBeVisible();

	await open_friend_list(sender_page);
	await expect(sender_page.getByText("暂无好友")).toBeVisible();

	await sender_page.getByRole("button", { name: "添加好友" }).click();
	const add_friend_dialog = sender_page.locator("dialog[open]");
	await search_user_until_found(
		sender_page,
		add_friend_dialog,
		receiver_id,
		receiver_name,
	);

	await add_friend_dialog.getByRole("button", { name: "发送好友请求" }).click();
	await expect(receiver_page.getByText(sender_name)).toBeVisible();
	await expect(receiver_page.getByText("请求添加你为好友")).toBeVisible();

	await receiver_page.getByRole("button", { name: "同意好友请求" }).click();
	await expect(receiver_page.getByText("已同意好友请求")).toBeVisible();
	await expect(add_friend_dialog.getByText("对方同意好友请求")).toBeVisible();
	await sender_page.keyboard.press("Escape");
	await expect(add_friend_dialog).not.toBeVisible();

	await expect(
		sender_page.getByRole("button", { name: `打开与 ${receiver_name} 的聊天` }),
	).toBeVisible();
	await expect(
		receiver_page.getByRole("button", {
			name: `打开与 ${sender_name} 的聊天`,
		}),
	).toBeVisible();
}

test.describe("HomeStore 事件循环", () => {
	test("好友请求完成后可以继续处理真实聊天请求", async ({ page, context }) => {
		test.setTimeout(90_000);
		const unique = `${Date.now()}-${test.info().workerIndex}`;
		const sender_name = `聊天甲-${unique}`;
		const receiver_name = `聊天乙-${unique}`;

		await register_user(page, sender_name);
		const receiver_id = await register_user(page, receiver_name);

		const receiver_page = await context.newPage();
		await login_as(receiver_page, receiver_name);
		await login_as(page, sender_name);

		await become_friends(
			page,
			receiver_page,
			receiver_id,
			sender_name,
			receiver_name,
		);

		await page
			.getByRole("button", { name: `打开与 ${receiver_name} 的聊天` })
			.click();
		await expect(page.getByText("已连接")).toBeVisible({ timeout: 30_000 });

		await receiver_page
			.getByRole("button", { name: `打开与 ${sender_name} 的聊天` })
			.click();
		await expect(receiver_page.getByText("已连接")).toBeVisible({
			timeout: 30_000,
		});
	});
});
