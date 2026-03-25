import test, { expect } from "@playwright/test";

test.describe("登录/注册界面", () => {
	test("登录表单验证", async ({ page }) => {
		await page.goto("http://localhost:8787");
		await page.getByLabel("账户选择账户").selectOption({ index: 0 });
		await page.getByRole("button", { name: "登录" }).click();
		await expect(page.getByRole("group")).toContainText("请选择一个账户");
	});
	test("删除用户表单验证", async ({ page }) => {
		await page.goto("http://localhost:8787");
		await page.getByLabel("账户选择账户").selectOption({ index: 0 });
		await page.getByRole("button", { name: "删除账户" }).click();
		await expect(page.getByRole("group")).toContainText("请选择一个账户");
	});
	test("注册用户表单验证", async ({ page }) => {
		await page.goto("http://localhost:8787");
		await page.getByLabel("账户选择账户").selectOption({ index: 0 });
		await page.getByRole("radio", { name: "注册" }).check();
		await page.getByRole("textbox", { name: "用户名" }).fill("");
		await page.getByRole("button", { name: "注册" }).click();
		await expect(page.getByRole("group")).toContainText("用户名不能为空");
	});
	test("删除用户", async ({ page }) => {
		await page.goto("http://localhost:8787");
		await page.getByRole("radio", { name: "注册" }).check();
		await page.getByRole("textbox", { name: "用户名" }).fill("张三");
		await page.getByRole("button", { name: "注册" }).click();
		await page.getByRole("radio", { name: "登录" }).check();
		await page.getByLabel("账户选择账户").selectOption({ index: 1 });
		await page.getByRole("button", { name: "删除账户" }).click();
		await expect(page.getByLabel("账户选择账户")).toHaveJSProperty(
			"selectedIndex",
			0,
		);
	});
	test("登录", async ({ page }) => {
		await page.goto("http://localhost:8787");
		await page.getByRole("radio", { name: "注册" }).check();
		await page.getByRole("textbox", { name: "用户名" }).fill("张三");
		await page.getByRole("button", { name: "注册" }).click();
		await page.getByRole("radio", { name: "登录" }).check();
		await page.getByLabel("账户选择账户").selectOption({ index: 1 });
		await page.getByRole("button", { name: "登录" }).click();
		await expect(page.getByRole("radio", { name: "登录" })).not.toBeVisible();
	});
});
