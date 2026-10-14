import { expect, test } from "@playwright/test";

test("inserted note shows its text and keeps its link", async ({ page }) => {
	await page.goto("/");
	await page.waitForFunction(() => window.harness.engine !== null);
	await page.evaluate(() => window.harness.engine!.insertNote("notes/hello.md"));
	await expect(page.locator(".canvas-deck-note")).toHaveText("Hello from a note");
	await page.waitForFunction(() => window.harness.engine!.slide.elements.some((e) => e.type === "embeddable"));
	const el = await page.evaluate(() => window.harness.engine!.slide.elements.find((e) => e.type === "embeddable")!);
	expect(el.link).toBe("obsidian-note:notes/hello.md");
	expect(el.width).toBe(600);
	expect(el.height).toBe(400);
});

test("note survives deck save and reload", async ({ page }) => {
	await page.goto("/?deck");
	await page.waitForFunction(() => window.harness.engine !== null);
	await page.evaluate(() => window.harness.engine!.insertNote("notes/hello.md"));
	await page.waitForFunction(() => window.harness.deck!.slides[0].data.elements.some((e) => e.type === "embeddable"));
	const md = await page.evaluate(() => window.harness.serialize(window.harness.deck!));
	const parsed = await page.evaluate((md) => window.harness.parse(md), md);
	expect(parsed.slides[0].data.elements.find((e) => e.type === "embeddable")?.link).toBe("obsidian-note:notes/hello.md");

	await page.evaluate((md) => sessionStorage.setItem("deck", md), md);
	await page.goto("/?deck=stored");
	await page.waitForFunction(() => window.harness.engine !== null);
	await expect(page.locator(".canvas-deck-note")).toHaveText("Hello from a note");
});

test("in present mode a click on a note exits and opens it", async ({ page }) => {
	await page.goto("/?deck");
	await page.waitForFunction(() => window.harness.engine !== null);
	await page.evaluate(() => window.harness.engine!.insertNote("notes/hello.md"));
	await page.waitForFunction(() => window.harness.deck!.slides[0].data.elements.some((e) => e.type === "embeddable"));
	await page.getByText("▶ Present").click();
	const note = page.locator(".canvas-deck-presenter .canvas-deck-note");
	await expect(note).toHaveText("Hello from a note");
	await page.waitForTimeout(300);
	await note.click();
	await expect(page.locator(".canvas-deck-presenter")).toHaveCount(0);
	expect(await page.evaluate(() => window.harness.opened)).toEqual(["notes/hello.md"]);
});

test("in the editor a click selects the note, a second click opens it", async ({ page }) => {
	await page.goto("/");
	await page.waitForFunction(() => window.harness.engine !== null);
	await page.evaluate(() => window.harness.engine!.insertNote("notes/hello.md"));
	const note = page.locator(".canvas-deck-note");
	await expect(note).toHaveText("Hello from a note");
	const box = (await note.boundingBox())!;
	const x = box.x + box.width / 2;
	const y = box.y + box.height / 2;
	await page.mouse.click(x, y);
	await page.waitForTimeout(300);
	expect(await page.evaluate(() => window.harness.opened)).toEqual([]);
	await page.screenshot({ path: "test-results/screens/note-editor.png" });
	await page.mouse.click(x, y);
	expect(await page.evaluate(() => window.harness.opened)).toEqual(["notes/hello.md"]);
});

test("long note scrolls in present mode", async ({ page }) => {
	await page.goto("/?deck");
	await page.waitForFunction(() => window.harness.engine !== null);
	await page.evaluate(() => {
		window.harness.notes.set("notes/long.md", Array.from({ length: 200 }, (_, i) => `line ${i}`).join("\n"));
		window.harness.engine!.insertNote("notes/long.md");
	});
	await page.waitForFunction(() => window.harness.deck!.slides[0].data.elements.some((e) => e.type === "embeddable"));
	await page.getByText("▶ Present").click();
	const note = page.locator(".canvas-deck-presenter .canvas-deck-note");
	await expect(note).toContainText("line 0");
	await page.waitForTimeout(300);
	await note.hover();
	await page.mouse.wheel(0, 300);
	await expect.poll(() => note.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
});
