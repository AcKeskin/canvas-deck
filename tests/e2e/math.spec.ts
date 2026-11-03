import { expect, test, type Page } from "@playwright/test";

async function insertMath(page: Page, latex: string) {
	await page.waitForFunction(() => window.harness.engine !== null);
	await page.evaluate((l) => window.harness.engine!.insertMath(l), latex);
	await page.waitForFunction(() => window.harness.engine!.slide.elements.some((e) => e.customData?.latex));
}

const mathEl = (page: Page) => page.evaluate(() => window.harness.engine!.slide.elements.find((e) => e.customData?.latex)!);

test("an equation is an SVG image made from its LaTeX, never saved to the vault", async ({ page }) => {
	await page.goto("/");
	await insertMath(page, "e^{i\\pi} + 1 = 0");
	const el = await mathEl(page);
	expect(el.type).toBe("image");
	const file = await page.evaluate((id) => window.harness.engine!.api.getFiles()[id], (el as { fileId: string }).fileId);
	expect(file.mimeType).toBe("image/svg+xml");
	await page.waitForTimeout(500);
	expect(await page.evaluate(() => window.harness.saveCalls)).toBe(0);
	expect(await page.evaluate(() => Object.keys(window.harness.engine!.slide.images))).toEqual([]);
});

test("double-click edits the equation and keeps its scale", async ({ page }) => {
	await page.goto("/");
	await insertMath(page, "x^2");
	const before = await mathEl(page);
	// Make it twice as big, as a user resize would.
	await page.evaluate(() => {
		const e = window.harness.engine!;
		const els = e.api.getSceneElements().map((x) => (x.customData?.latex ? { ...x, width: x.width * 2, height: x.height * 2 } : x));
		e.api.updateScene({ elements: els });
	});
	await page.evaluate(() => (window.harness.nextMath = "x^2 x^2"));
	const c = await page.evaluate((id) => {
		const e = window.harness.engine!;
		const el = e.api.getSceneElements().find((x) => x.id === id)!;
		const s = e.api.getAppState();
		return { x: (el.x + el.width / 2 + s.scrollX) * s.zoom.value + s.offsetLeft, y: (el.y + el.height / 2 + s.scrollY) * s.zoom.value + s.offsetTop };
	}, before.id);
	await page.mouse.dblclick(c.x, c.y);
	await page.waitForFunction(() => window.harness.engine!.slide.elements.some((e) => e.customData?.latex === "x^2 x^2"));
	expect(await page.evaluate(() => window.harness.mathEdits)).toEqual(["x^2"]);
	const after = await mathEl(page);
	expect(after.id).toBe(before.id);
	expect(after.height).toBeCloseTo(before.height * 2, 0);
	expect(after.width).toBeGreaterThan(before.width * 2);
});

test("equations come back after reload", async ({ page }) => {
	await page.goto("/?deck");
	await insertMath(page, "\\int_0^1 x\\,dx = \\tfrac12");
	await page.waitForFunction(() => window.harness.deck!.slides[0].data.elements.some((e) => e.customData?.latex));
	await page.evaluate(() => sessionStorage.setItem("deck", window.harness.serialize(window.harness.deck!)));
	await page.goto("/?deck=stored");
	await page.waitForFunction(() => window.harness.engine !== null);
	const el = await mathEl(page);
	await page.waitForFunction((id) => !!window.harness.engine!.api.getFiles()[id], (el as { fileId: string }).fileId);
});
