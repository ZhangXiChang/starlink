import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "tests",
	testMatch: "home_store_events.test.ts",
	reporter: "line",
});
