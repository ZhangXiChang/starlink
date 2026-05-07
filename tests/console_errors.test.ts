import test, { expect } from "@playwright/test";

test("登录后没有控制台报错", async ({ page }) => {
	const errors: string[] = [];
	const logs: string[] = [];
	page.on("console", (msg) => {
		const text = msg.text();
		if (msg.type() === "error") {
			errors.push(text);
		}
		logs.push(`[${msg.type()}] ${text}`);
	});
	page.on("pageerror", (err) => {
		errors.push(err.message);
	});

	await page.goto("http://localhost:8787");
	await page.getByRole("radio", { name: "注册" }).check();
	await page.getByRole("textbox", { name: "用户名" }).fill("testuser");
	await page.getByRole("button", { name: "注册" }).click();
	await page.waitForFunction(() => {
		const select = document.querySelector('select');
		return select && select.options.length > 1;
	});
	await page.getByRole("radio", { name: "登录" }).check();
	await page.getByLabel("账户选择账户").selectOption({ index: 1 });
	await page.getByRole("button", { name: "登录" }).click();
	await expect(page.getByRole("radio", { name: "登录" })).not.toBeVisible();
	await page.waitForTimeout(2000);

	console.log("=== BROWSER LOGS ===");
	for (const log of logs) {
		console.log(log);
	}
	console.log("=== END LOGS ===");

	expect(errors, `控制台报错: ${errors.join("\n")}`).toHaveLength(0);
});
