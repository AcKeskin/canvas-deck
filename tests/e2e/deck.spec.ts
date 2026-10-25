import { expect, test } from "@playwright/test";

const shots = "test-results/screens";

test.beforeEach(async ({ page }) => {
	await page.goto("/?deck");
	await page.waitForFunction(() => window.harness.engine !== null);
	await page.waitForTimeout(800); // thumbnails
});

test("editor shows slides, notes and saved views", async ({ page }) => {
	await expect(page.locator(".canvas-deck-list-item")).toHaveCount(3);
	await expect(page.locator(".canvas-deck-notes")).toHaveValue(/infinite canvas/);
	await page.screenshot({ path: `${shots}/1-editor.png` });

	await page.locator(".canvas-deck-list-item").nth(2).click();
	await page.waitForFunction(() => window.harness.engine?.slide.views.length === 3);
	await expect(page.locator(".canvas-deck-view-chip")).toHaveCount(3);
	await page.waitForTimeout(500);
	await page.screenshot({ path: `${shots}/2-big-diagram.png` });
});

test("add, rename, reorder and delete slides; notes save", async ({ page }) => {
	await page.getByTitle("Add slide").click();
	await expect(page.locator(".canvas-deck-list-item")).toHaveCount(4);
	await page.getByLabel("Slide title").fill("My new slide");
	await page.locator(".canvas-deck-notes").fill("remember this");
	await page.getByTitle("Move up").click();
	const deck = await page.evaluate(() => window.harness.deck!);
	expect(deck.slides.map((s) => s.title)).toEqual(["My new slide", "Canvas Deck", "How it works", "A big diagram"]);
	expect(deck.slides[0].notes).toBe("remember this");

	// Delete asks first; Cancel keeps the slide.
	let asked = "";
	page.once("dialog", (d) => {
		asked = d.message();
		void d.dismiss();
	});
	await page.getByTitle("Delete slide").click();
	await expect.poll(() => asked).toBe('Delete slide "My new slide"?');
	await expect(page.locator(".canvas-deck-list-item")).toHaveCount(4);

	page.once("dialog", (d) => void d.accept());
	await page.getByTitle("Delete slide").click();
	await expect(page.locator(".canvas-deck-list-item")).toHaveCount(3);
	expect((await page.evaluate(() => window.harness.deck!)).slides.map((s) => s.title)).toEqual(["Canvas Deck", "How it works", "A big diagram"]);
});

test("drawing on a slide and saving a view survive save and reload", async ({ page }) => {
	await page.locator(".canvas-deck-list-item").nth(1).click();
	await page.waitForTimeout(300);
	await page.evaluate(() => window.harness.engine!.api.setActiveTool({ type: "rectangle" }));
	await page.mouse.move(700, 500);
	await page.mouse.down();
	await page.mouse.move(900, 650, { steps: 5 });
	await page.mouse.up();
	await page.getByText("+ Save view").click();
	await page.waitForFunction(() => window.harness.deck!.slides[1].data.views.length === 1);
	const md = await page.evaluate(() => window.harness.serialize(window.harness.deck!));
	expect(md).toContain("## How it works");

	await page.evaluate((md) => sessionStorage.setItem("deck", md), md);
	await page.goto("/?deck=stored");
	await page.waitForFunction(() => window.harness.engine !== null);
	const reloaded = await page.evaluate(() => window.harness.deck!);
	const before = await page.evaluate((md) => window.harness.parse(md), md);
	expect(reloaded).toEqual(before);
	expect(reloaded.slides[1].data.elements.length).toBeGreaterThan(6);
	expect(reloaded.slides[1].data.views).toHaveLength(1);
});

test("present mode steps through views and slides", async ({ page }) => {
	await page.getByText("▶ Present").click();
	await expect(page.locator(".canvas-deck-presenter")).toBeVisible();
	await expect(page.locator(".canvas-deck-present-bar")).toContainText("1 / 3");
	await page.waitForTimeout(500);
	await page.screenshot({ path: `${shots}/3-present.png` });

	await page.keyboard.press("ArrowRight");
	await expect(page.locator(".canvas-deck-present-bar")).toContainText("2 / 3");
	await page.keyboard.press("n");
	await expect(page.locator(".canvas-deck-present-notes")).toContainText("sketch style");
	await page.waitForTimeout(500);
	await page.screenshot({ path: `${shots}/4-present-notes.png` });
	await page.keyboard.press("n");

	await page.keyboard.press("ArrowRight");
	await expect(page.locator(".canvas-deck-present-bar")).toContainText("3 / 3");
	await page.waitForTimeout(800);
	await page.screenshot({ path: `${shots}/5a-present-whole-diagram.png` });
	await page.keyboard.press("ArrowRight");
	await expect(page.locator(".canvas-deck-present-bar")).toContainText("Top left");
	await page.keyboard.press("ArrowRight");
	await expect(page.locator(".canvas-deck-present-bar")).toContainText("Middle");
	await page.waitForTimeout(900);
	const b = await page.evaluate(() => window.harness.engine!.camera.currentBounds());
	expect(b.x + b.width / 2).toBeCloseTo(4800, -1);
	await page.screenshot({ path: `${shots}/5-present-view.png` });

	await page.keyboard.press("Escape");
	await expect(page.locator(".canvas-deck-presenter")).toHaveCount(0);
});

test("adding after the last slide selects the new slide", async ({ page }) => {
	await page.locator(".canvas-deck-list-item").nth(2).click();
	await page.getByTitle("Add slide").click();
	await expect(page.locator(".canvas-deck-list-item").nth(3)).toHaveClass(/is-active/);
	await expect(page.getByLabel("Slide title")).toHaveValue("Slide 4");
});

test("after present exits, commands act on the editor canvas", async ({ page }) => {
	await page.getByText("▶ Present").click();
	await expect(page.locator(".canvas-deck-presenter")).toBeVisible();
	await page.waitForTimeout(300);
	await page.keyboard.press("Escape");
	await expect(page.locator(".canvas-deck-presenter")).toHaveCount(0);
	await page.evaluate(() => window.harness.engine!.saveCurrentView("After present"));
	await page.waitForFunction(() => window.harness.deck!.slides[0].data.views.length === 1);
});

test("text is re-measured once the font loads", async ({ page }) => {
	await page.waitForFunction(() => {
		const ctx = document.createElement("canvas").getContext("2d")!;
		return window.harness.engine!.api.getSceneElements().filter((e) => e.type === "text").every((e: any) => {
			ctx.font = `${e.fontSize}px Excalifont`;
			return Math.abs(ctx.measureText(e.text).width - e.width) < 1;
		});
	});
});

test("big diagram slide draws without errors", async ({ page }) => {
	const errors: string[] = [];
	page.on("console", (m) => m.type() === "error" && m.text().includes("TypeError") && errors.push(m.text()));
	await page.locator(".canvas-deck-list-item").nth(2).click();
	await page.waitForTimeout(1500);
	expect(errors).toEqual([]);
});
