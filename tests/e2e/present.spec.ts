import { expect, test, type Page } from "@playwright/test";

const shots = "test-results/screens";

test.beforeEach(async ({ page }) => {
	await page.goto("/?deck");
	await page.waitForFunction(() => window.harness.engine !== null);
	await page.getByText("▶ Present").click();
	await expect(page.locator(".canvas-deck-presenter")).toBeVisible();
	await page.waitForTimeout(500);
});

async function stroke(page: Page, y: number) {
	await page.mouse.move(500, y);
	await page.mouse.down();
	await page.mouse.move(900, y + 80, { steps: 10 });
	await page.mouse.up();
}

const freedraws = (page: Page, slide: number) =>
	page.evaluate((i) => window.harness.deck!.slides[i].data.elements.filter((e) => e.type === "freedraw").length, slide);

test("G opens the grid and a view click jumps there", async ({ page }) => {
	await page.keyboard.press("g");
	const grid = page.locator(".canvas-deck-grid");
	await expect(grid.locator(".canvas-deck-grid-item")).toHaveCount(3);
	await expect(grid.locator(".canvas-deck-grid-view")).toHaveCount(3);
	await page.waitForTimeout(1500); // thumbnails
	await page.screenshot({ path: `${shots}/6-present-grid.png` });

	await grid.getByText("Middle").click();
	await expect(grid).toHaveCount(0);
	await expect(page.locator(".canvas-deck-present-bar")).toContainText("3 / 3 · Middle");
	await page.waitForTimeout(500);
	const b = await page.evaluate(() => window.harness.engine!.camera.currentBounds());
	expect(b.x + b.width / 2).toBeCloseTo(4800, -1);

	// Esc closes the grid without leaving present mode.
	await page.keyboard.press("g");
	await expect(grid).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(grid).toHaveCount(0);
	await expect(page.locator(".canvas-deck-presenter")).toBeVisible();
});

test("P draws ink and K keeps it on the slide", async ({ page }) => {
	await page.keyboard.press("p");
	await expect(page.getByLabel("Pen")).toHaveClass(/is-active/);
	const before = await page.evaluate(() => window.harness.engine!.camera.camera);
	await stroke(page, 300);
	// Drawing doesn't pan the slide.
	expect(await page.evaluate(() => window.harness.engine!.camera.camera)).toEqual(before);
	await expect(page.getByText("Keep ink")).toBeVisible();
	await page.screenshot({ path: `${shots}/7-present-ink.png` });
	expect(await freedraws(page, 0)).toBe(0);

	await page.keyboard.press("k");
	await page.waitForFunction(() => window.harness.deck!.slides[0].data.elements.some((e) => e.type === "freedraw"));
	await expect(page.getByText("Keep ink")).toHaveCount(0);
	const el = await page.evaluate(
		() => window.harness.deck!.slides[0].data.elements.find((e) => e.type === "freedraw") as any,
	);
	expect(el.points.length).toBeGreaterThan(5);
	expect(el.strokeColor).toBe("#e03131");

	// Esc turns the pen off first, then exits.
	await page.keyboard.press("Escape");
	await expect(page.getByLabel("Pen")).not.toHaveClass(/is-active/);
	await page.keyboard.press("Escape");
	await expect(page.locator(".canvas-deck-presenter")).toHaveCount(0);
	expect(await freedraws(page, 0)).toBe(1);
});

test("ink not kept is gone after the next slide", async ({ page }) => {
	await page.getByLabel("Pen").click();
	await stroke(page, 300);
	await expect(page.getByText("Keep ink")).toBeVisible();
	await page.keyboard.press("ArrowRight");
	await expect(page.locator(".canvas-deck-present-bar")).toContainText("2 / 3");
	await expect(page.getByText("Keep ink")).toHaveCount(0);
	await page.keyboard.press("ArrowLeft");
	await expect(page.locator(".canvas-deck-present-bar")).toContainText("1 / 3");
	await page.keyboard.press("k");
	await page.waitForTimeout(300);
	expect(await freedraws(page, 0)).toBe(0);
	expect(await freedraws(page, 1)).toBe(0);
});

test("laser shows a dot and doesn't pan", async ({ page }) => {
	await page.keyboard.press("l");
	const before = await page.evaluate(() => window.harness.engine!.camera.camera);
	await page.mouse.move(600, 400);
	await page.mouse.down();
	await page.mouse.move(800, 450, { steps: 8 });
	await page.mouse.up();
	expect(await page.evaluate(() => window.harness.engine!.camera.camera)).toEqual(before);
	// The ink canvas has red pixels under the pointer.
	const red = await page.evaluate(() => {
		const c = document.querySelector<HTMLCanvasElement>(".canvas-deck-ink")!;
		const dpr = window.devicePixelRatio || 1;
		const [r, g] = c.getContext("2d")!.getImageData(800 * dpr, 450 * dpr, 1, 1).data;
		return r > 200 && g < 100;
	});
	expect(red).toBe(true);
	await page.screenshot({ path: `${shots}/8-present-laser.png` });
});

test("E edits the slide in present mode and the editor keeps it", async ({ page }) => {
	const before = await page.evaluate(() => window.harness.deck!.slides[0].data.elements.length);
	await page.keyboard.press("e");
	await expect(page.locator(".canvas-deck-present-bar [aria-label=Edit]")).toHaveText("Done");
	await page.evaluate(() => window.harness.engine!.api.setActiveTool({ type: "rectangle" }));
	await page.mouse.move(300, 300);
	await page.mouse.down();
	await page.mouse.move(500, 450, { steps: 5 });
	await page.mouse.up();
	await page.waitForFunction((n) => window.harness.deck!.slides[0].data.elements.length === n + 1, before);
	await page.keyboard.press("Escape");
	await expect(page.locator(".canvas-deck-present-bar [aria-label=Edit]")).toHaveText("Edit");
	await page.keyboard.press("Escape");
	await expect(page.locator(".canvas-deck-presenter")).toHaveCount(0);
	await page.waitForTimeout(500);
	const inEditor = await page.evaluate(() => window.harness.engine!.api.getSceneElements().length);
	expect(inEditor).toBe(before + 1);
});

test("? shows the keys", async ({ page }) => {
	await page.keyboard.press("?");
	await expect(page.locator(".canvas-deck-help")).toContainText("Laser pointer");
	await page.keyboard.press("Escape");
	await expect(page.locator(".canvas-deck-help")).toHaveCount(0);
	await expect(page.locator(".canvas-deck-presenter")).toBeVisible();
});

test("H shows every key", async ({ page }) => {
	await page.keyboard.press("h");
	await expect(page.locator(".canvas-deck-help")).toContainText("PageDown");
	await expect(page.locator(".canvas-deck-help")).toContainText("Backspace");
	await page.keyboard.press("h");
	await expect(page.locator(".canvas-deck-help")).toHaveCount(0);
});
