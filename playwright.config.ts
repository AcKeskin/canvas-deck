import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "tests/e2e",
	timeout: 60_000,
	use: {
		baseURL: "http://localhost:5199",
		viewport: { width: 1600, height: 900 },
		launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
	},
	webServer: { command: "npx vite", url: "http://localhost:5199", reuseExistingServer: true },
});
