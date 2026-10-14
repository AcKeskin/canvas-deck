import { expect, test, type Page } from "@playwright/test";

const COUNTER = `<button>Clicked 0 times</button>
<script>
	const b = document.querySelector("button");
	let n = 0;
	b.onclick = () => (b.textContent = \`Clicked \${++n} times\`);
</script>`;

const CARD = "iframe.canvas-deck-code";

async function insertCard(page: Page, source = COUNTER) {
	await page.waitForFunction(() => window.harness.engine !== null);
	await page.evaluate((s) => window.harness.engine!.insertCodeCard(s), source);
	await page.waitForFunction(() => window.harness.engine!.slide.elements.some((e) => e.type === "embeddable"));
}

/** In the editor a quick click on the middle of an embed makes it interactive. */
async function activate(page: Page) {
	const box = (await page.locator(CARD).boundingBox())!;
	await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
	await page.waitForTimeout(300);
}

/** Clicks the card's button by position. Playwright ignores the canvas zoom on iframe content. */
async function clickButton(page: Page, card = page.locator(CARD)) {
	const box = (await card.boundingBox())!;
	const scale = box.width / (await card.evaluate((f) => (f as HTMLElement).offsetWidth));
	const r = await card.contentFrame().locator("button").evaluate((el) => el.getBoundingClientRect().toJSON());
	await page.mouse.click(box.x + (r.x + r.width / 2) * scale, box.y + (r.y + r.height / 2) * scale);
}

test("code card runs sandboxed and is interactive in the editor", async ({ page }) => {
	await page.goto("/");
	await insertCard(page);
	await expect(page.locator(CARD)).toHaveAttribute("sandbox", "allow-scripts");
	const el = await page.evaluate(() => window.harness.engine!.slide.elements.find((e) => e.type === "embeddable")!);
	expect(el.link).toBe("canvas-deck-code:");
	expect(el.customData?.source).toBe(COUNTER);

	await activate(page);
	await clickButton(page);
	await clickButton(page);
	await expect(page.locator(CARD).contentFrame().locator("button")).toHaveText("Clicked 2 times");
});

test("editing the source reloads the card", async ({ page }) => {
	await page.goto("/");
	await insertCard(page);
	const id = await page.evaluate(() => window.harness.engine!.slide.elements.find((e) => e.type === "embeddable")!.id);
	await page.evaluate(async (id) => {
		window.harness.nextCode = "<p>Edited</p>";
		await window.harness.engine!.editCode(id);
	}, id);
	await expect(page.locator(CARD).contentFrame().locator("p")).toHaveText("Edited");
	expect(await page.evaluate(() => window.harness.codeEdits)).toEqual([COUNTER]);

	// Cancel keeps the source.
	await page.evaluate(async (id) => {
		window.harness.nextCode = null;
		await window.harness.engine!.editCode(id);
	}, id);
	expect(await page.evaluate(() => window.harness.engine!.slide.elements.find((e) => e.type === "embeddable")!.customData?.source)).toBe("<p>Edited</p>");
});

test("code card is interactive in present mode", async ({ page }) => {
	await page.goto("/?deck");
	await insertCard(page);
	await page.waitForFunction(() => window.harness.deck!.slides[0].data.elements.some((e) => e.type === "embeddable"));
	await page.getByText("▶ Present").click();
	const card = page.locator(`.canvas-deck-presenter ${CARD}`);
	await expect(card).toHaveAttribute("sandbox", "allow-scripts");
	await page.waitForTimeout(300);
	await clickButton(page, card);
	await expect(card.contentFrame().locator("button")).toHaveText("Clicked 1 times");
	await expect(page.locator(".canvas-deck-presenter")).toHaveCount(1);
	expect(await page.evaluate(() => window.harness.codeEdits)).toEqual([]);
});

test("code card survives deck save and reload", async ({ page }) => {
	await page.goto("/?deck");
	await insertCard(page);
	await page.waitForFunction(() => window.harness.deck!.slides[0].data.elements.some((e) => e.type === "embeddable"));
	const md = await page.evaluate(() => window.harness.serialize(window.harness.deck!));
	await page.evaluate((md) => sessionStorage.setItem("deck", md), md);
	await page.goto("/?deck=stored");
	await page.waitForFunction(() => window.harness.engine !== null);
	await expect(page.locator(CARD)).toBeVisible();
	// Let the camera settle on the frame before clicking.
	await page.waitForTimeout(500);
	await activate(page);
	await clickButton(page);
	await expect(page.locator(CARD).contentFrame().locator("button")).toHaveText("Clicked 1 times");
});
