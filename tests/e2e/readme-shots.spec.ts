import { test, type Page } from "@playwright/test";

// README screenshots. Run with: SHOTS=1 npx playwright test readme-shots
test.skip(!process.env.SHOTS, "set SHOTS=1 to update README screenshots");
test.use({ viewport: { width: 1280, height: 720 } });

const out = "docs/screens";

async function openDeck(page: Page) {
	await page.goto("/?deck");
	await page.waitForFunction(() => window.harness.engine !== null);
	await page.waitForTimeout(2500); // fonts and thumbnails
}

async function present(page: Page) {
	await page.getByText("▶ Present").click();
	await page.waitForTimeout(1200);
}

test("editor", async ({ page }) => {
	await openDeck(page);
	await page.locator(".canvas-deck-list-item").nth(1).click();
	await page.waitForTimeout(1500);
	await page.screenshot({ path: `${out}/editor.png` });

	await page.locator(".canvas-deck-list-item").nth(2).click();
	await page.waitForFunction(() => window.harness.engine?.slide.views.length === 3);
	await page.locator(".canvas-deck-view-chip").getByText("Middle").click();
	await page.waitForTimeout(2000);
	await page.screenshot({ path: `${out}/saved-views.png` });
});

test("present with pen", async ({ page }) => {
	await openDeck(page);
	await present(page);
	await page.keyboard.press("p");
	// Circle the title.
	const cx = 640, cy = 330, rx = 330, ry = 90;
	await page.mouse.move(cx + rx, cy);
	await page.mouse.down();
	for (let i = 1; i <= 60; i++) {
		const a = (i / 60) * Math.PI * 2.1;
		await page.mouse.move(cx + rx * Math.cos(a), cy + ry * Math.sin(a));
	}
	await page.mouse.up();
	await page.mouse.move(900, 600);
	await page.waitForTimeout(300);
	await page.screenshot({ path: `${out}/present-pen.png` });
});

test("grid and keys", async ({ page }) => {
	await openDeck(page);
	await present(page);
	await page.keyboard.press("g");
	await page.waitForTimeout(2000);
	await page.screenshot({ path: `${out}/grid.png`, clip: { x: 0, y: 0, width: 780, height: 270 } });
	await page.keyboard.press("Escape");
	await page.keyboard.press("?");
	await page.waitForTimeout(300);
	await page.screenshot({ path: `${out}/keys.png` });
});
