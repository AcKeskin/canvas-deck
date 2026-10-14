import { expect, test } from "@playwright/test";

const shots = "test-results/screens";

test.beforeEach(async ({ page }) => {
	await page.goto("/?deck");
	await page.waitForFunction(() => window.harness.engine !== null);
	await page.waitForTimeout(500);
});

const frame = (page: import("@playwright/test").Page, i = 0) =>
	page.evaluate((i) => window.harness.deck!.slides[i].data.frame, i);

test("frame aspect changes the saved frame", async ({ page }) => {
	await page.getByLabel("Frame aspect").selectOption("4:3");
	await page.waitForFunction(() => {
		const f = window.harness.deck!.slides[0].data.frame;
		return Math.abs(f.width / f.height - 4 / 3) < 0.01;
	});
	await page.getByLabel("Frame aspect").selectOption("9:16");
	await page.waitForFunction(() => {
		const f = window.harness.deck!.slides[0].data.frame;
		return Math.abs(f.width / f.height - 9 / 16) < 0.01;
	});
	await page.waitForTimeout(700);
	await page.screenshot({ path: `${shots}/a1-portrait-frame.png` });

	await page.getByText("▶ Present").click();
	await page.waitForTimeout(800);
	const b = await page.evaluate(() => window.harness.engine!.camera.currentBounds());
	const f = await frame(page);
	// Fit: the whole frame is visible, centered.
	expect(b.height).toBeCloseTo(f.height, -1);
	expect(b.x + b.width / 2).toBeCloseTo(f.x + f.width / 2, -1);
	await page.screenshot({ path: `${shots}/a2-present-portrait.png` });
});

test("edit frame: drag to move, corner to resize keeping aspect", async ({ page }) => {
	await page.getByRole("button", { name: "Edit frame" }).click();
	const box = page.locator(".canvas-deck-frame.is-editing");
	await expect(box).toBeVisible();
	const before = await frame(page);
	const r = (await box.boundingBox())!;

	// Move by dragging inside.
	await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
	await page.mouse.down();
	await page.mouse.move(r.x + r.width / 2 + 100, r.y + r.height / 2 + 50, { steps: 5 });
	await page.mouse.up();
	const moved = await frame(page);
	expect(moved.width).toBe(before.width);
	expect(moved.x).toBeGreaterThan(before.x);
	expect(moved.y).toBeGreaterThan(before.y);

	// Resize from the top-left corner (the bottom-right one is now off screen).
	const h = (await page.locator(".canvas-deck-frame-handle.is-nw").boundingBox())!;
	await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
	await page.mouse.down();
	await page.mouse.move(h.x - 150, h.y - 10, { steps: 5 });
	await page.mouse.up();
	const resized = await frame(page);
	expect(resized.width).toBeGreaterThan(moved.width);
	expect(resized.width / resized.height).toBeCloseTo(16 / 9, 2);
	expect(resized.x + resized.width).toBeCloseTo(moved.x + moved.width);
	expect(resized.y + resized.height).toBeCloseTo(moved.y + moved.height);
	await page.screenshot({ path: `${shots}/a3-edit-frame.png` });

	// Free aspect: resize changes the ratio.
	await page.getByLabel("Frame aspect").selectOption("free");
	await page.getByRole("button", { name: "Frame", exact: true }).click();
	await page.waitForTimeout(800);
	const h2 = (await page.locator(".canvas-deck-frame-handle.is-nw").boundingBox())!;
	await page.mouse.move(h2.x + h2.width / 2, h2.y + h2.height / 2);
	await page.mouse.down();
	await page.mouse.move(h2.x + h2.width / 2 + 150, h2.y + h2.height / 2, { steps: 5 });
	await page.mouse.up();
	const free = await frame(page);
	expect(free.width / free.height).toBeLessThan(16 / 9 - 0.05);
	await expect(page.getByLabel("Frame aspect")).toHaveValue("free");
});

test("view notes edit in the editor and show in present mode", async ({ page }) => {
	await page.locator(".canvas-deck-list-item").nth(2).click();
	await page.waitForFunction(() => window.harness.engine?.slide.views.length === 3);
	const label = page.locator(".canvas-deck-notes-label");
	await expect(label).toHaveText("Notes — slide");

	await page.getByRole("button", { name: "Middle", exact: true }).click();
	await expect(label).toHaveText("Notes — view: Middle");
	await expect(page.locator(".canvas-deck-notes")).toHaveValue("");
	await page.locator(".canvas-deck-notes").fill("Point at the middle.");
	const views = await page.evaluate(() => window.harness.deck!.slides[2].data.views);
	expect(views.find((v) => v.name === "Middle")!.notes).toBe("Point at the middle.");
	expect(await page.evaluate(() => window.harness.deck!.slides[2].notes)).toContain("2,000 objects");

	// Frame goes back to slide notes.
	await page.getByRole("button", { name: "Frame", exact: true }).click();
	await expect(label).toHaveText("Notes — slide");
	await expect(page.locator(".canvas-deck-notes")).toHaveValue(/2,000 objects/);

	// Survives a save.
	const md = await page.evaluate(() => window.harness.serialize(window.harness.deck!));
	const parsed = await page.evaluate((md) => window.harness.parse(md), md);
	expect(parsed.slides[2].data.views.find((v) => v.name === "Middle")!.notes).toBe("Point at the middle.");

	await page.getByText("▶ Present").click();
	await expect(page.locator(".canvas-deck-presenter")).toBeVisible();
	await page.keyboard.press("n");
	await expect(page.locator(".canvas-deck-present-notes")).toContainText("2,000 objects");
	await page.keyboard.press("ArrowRight");
	await expect(page.locator(".canvas-deck-present-bar")).toContainText("Top left");
	await expect(page.locator(".canvas-deck-present-notes")).toContainText("2,000 objects");
	await page.keyboard.press("ArrowRight");
	await expect(page.locator(".canvas-deck-present-bar")).toContainText("Middle");
	await expect(page.locator(".canvas-deck-present-notes")).toHaveText("Point at the middle.");
	await page.waitForTimeout(800);
	await page.screenshot({ path: `${shots}/a4-present-view-notes.png` });
});

test("insert slide from a template copy", async ({ page }) => {
	await page.locator(".canvas-deck-list-item").nth(1).click();
	await page.waitForTimeout(300);
	await page.evaluate(() => {
		const h = window.harness.handle!;
		const s = window.harness.parse(window.harness.serialize({ frontmatter: [], slides: [h.currentSlide()] })).slides[0];
		h.insertSlide(s);
	});
	await expect(page.locator(".canvas-deck-list-item")).toHaveCount(4);
	await expect(page.locator(".canvas-deck-list-item").nth(2)).toHaveClass(/is-active/);
	const deck = await page.evaluate(() => window.harness.deck!);
	expect(deck.slides[2].title).toBe("How it works");
	expect(deck.slides[2].id).not.toBe(deck.slides[1].id);
	expect(deck.slides[2].data.elements.length).toBe(deck.slides[1].data.elements.length);
});
