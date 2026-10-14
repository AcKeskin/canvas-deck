import { expect, test, type Page } from "@playwright/test";

const bar = ".canvas-deck-present-bar";

test.beforeEach(async ({ page }) => {
	await page.goto("/?deck");
	await page.waitForFunction(() => window.harness.engine !== null);
	await page.waitForTimeout(500);
});

/** Selects one element. Excalidraw applies the selection on its next render. */
async function select(page: Page, id: string | null) {
	await page.evaluate((id) => window.harness.engine!.api.updateScene({ appState: { selectedElementIds: id ? { [id]: true } : {} } as any }), id);
	await page.waitForTimeout(100);
}

/** Links the big title text on slide 1 to slide `to` (and its view `view`). Returns the text's id. */
async function linkTitle(page: Page, to: number, view?: number, link?: string) {
	const id = await page.evaluate(() => window.harness.engine!.slide.elements.find((x) => x.type === "text")!.id);
	await select(page, id);
	await page.evaluate(
		({ to, view, link }) => {
			const h = window.harness;
			const target = h.deck!.slides[to];
			h.engine!.linkSelection(link ?? h.deckLink(target.id, view === undefined ? undefined : target.data.views[view].id));
		},
		{ to, view, link },
	);
	await select(page, null);
	await page.waitForFunction(() => window.harness.deck!.slides[0].data.elements.some((e) => e.link));
	return id;
}

/** Clicks the middle of an element on the current canvas. */
async function clickElement(page: Page, id: string) {
	const p = await page.evaluate((id) => {
		const e = window.harness.engine!;
		const el = e.api.getSceneElements().find((x) => x.id === id)!;
		const s = e.api.getAppState();
		const z = s.zoom.value;
		return {
			x: (el.x + el.width / 2 + s.scrollX) * z + s.offsetLeft,
			y: (el.y + el.height / 2 + s.scrollY) * z + s.offsetTop,
		};
	}, id);
	await page.mouse.click(p.x, p.y);
}

async function present(page: Page) {
	await page.getByText("▶ Present").click();
	await expect(page.locator(bar)).toContainText("1 / 3");
	await page.waitForTimeout(500);
}

test("a deck link jumps to a view on another slide in present mode", async ({ page }) => {
	const id = await linkTitle(page, 2, 1);
	await present(page);
	await clickElement(page, id);
	await expect(page.locator(bar)).toContainText("3 / 3 · Middle");
	await page.waitForTimeout(500);
	const b = await page.evaluate(() => window.harness.engine!.camera.currentBounds());
	expect(b.x + b.width / 2).toBeCloseTo(4800, -1);
	// Stepping goes on from there.
	await page.keyboard.press("ArrowRight");
	await expect(page.locator(bar)).toContainText("Bottom right");
});

test("a slide link jumps to that slide's start frame", async ({ page }) => {
	const id = await linkTitle(page, 1);
	await present(page);
	await clickElement(page, id);
	await expect(page.locator(bar)).toContainText("2 / 3");
	await expect(page.locator(bar)).not.toContainText("·");
});

test("a link to a missing slide does nothing", async ({ page }) => {
	const id = await linkTitle(page, 0, undefined, "#cdeck:gone");
	await present(page);
	await clickElement(page, id);
	await page.waitForTimeout(300);
	await expect(page.locator(bar)).toContainText("1 / 3");
	await expect(page.locator(".canvas-deck-presenter")).toBeVisible();
});

test("following a deck link in the editor selects that slide", async ({ page }) => {
	const id = await linkTitle(page, 2, 1);
	// Selecting the element and hovering it shows Excalidraw's link popup.
	await select(page, id);
	const p = await page.evaluate((id) => {
		const e = window.harness.engine!;
		const el = e.api.getSceneElements().find((x) => x.id === id)!;
		const s = e.api.getAppState();
		const z = s.zoom.value;
		return { x: (el.x + el.width / 2 + s.scrollX) * z + s.offsetLeft, y: (el.y + el.height / 2 + s.scrollY) * z + s.offsetTop };
	}, id);
	await page.mouse.move(p.x, p.y);
	await page.mouse.move(p.x + 2, p.y + 2);
	await page.locator(".excalidraw-hyperlinkContainer-link").click();
	await expect(page.locator(".canvas-deck-list-item").nth(2)).toHaveClass(/is-active/);
	await page.waitForTimeout(500);
	const b = await page.evaluate(() => window.harness.engine!.camera.currentBounds());
	expect(b.x + b.width / 2).toBeCloseTo(4800, -1);
});
