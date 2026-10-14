import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const CARD = `<button onclick="this.textContent = 'clicked'">Click me</button>`;

test("HTML export presents the deck with live embeds", async ({ page, context }) => {
	await page.goto("/?deck");
	await page.waitForFunction(() => window.harness.engine !== null);
	await page.evaluate((source) => {
		window.harness.engine!.addElements([
			{ type: "embeddable", x: 100, y: 100, width: 600, height: 400, link: "canvas-deck-code:", customData: { source } },
			{ type: "embeddable", x: 900, y: 100, width: 600, height: 400, link: "obsidian-note:notes/hello.md" },
		]);
	}, CARD);
	await page.waitForFunction(() => {
		const els = window.harness.deck!.slides[0].data.elements;
		return els.some((e) => e.customData?.source) && els.some((e) => e.link?.startsWith("obsidian-note:"));
	});
	await page.evaluate(() => (window.harness.deck!.slides[0].notes = "First </script> notes"));

	const html = await page.evaluate(() => window.harness.html());
	mkdirSync("test-results", { recursive: true });
	writeFileSync("test-results/deck.html", html);
	const order = await page.evaluate(() => window.harness.deck!.slides.flatMap((s, i) => [`${i}`, ...s.data.views.map((v) => `${i}:${v.name}`)]));

	const shown = await context.newPage();
	await shown.setContent(html);
	const pages = shown.locator("section.page");
	await expect(pages).toHaveCount(order.length);
	expect(await pages.evaluateAll((ps) => ps.map((p) => p.dataset.slide + (p.dataset.view ? `:${p.dataset.view}` : "")))).toEqual(order);
	await expect(shown.locator("section.page img")).toHaveCount(order.length);
	expect(await shown.locator("section.page img").evaluateAll((imgs) => imgs.every((i) => (i as HTMLImageElement).naturalWidth > 0))).toBe(true);

	const bar = shown.locator(".bar");
	const slides = await page.evaluate(() => window.harness.deck!.slides.length);
	await expect(bar).toHaveText(`1 / ${slides}`);
	await expect(pages.first()).toBeVisible();

	// Code card runs in a sandbox and its button works.
	const card = shown.locator("section.page").first().locator("iframe");
	await expect(card).toHaveAttribute("sandbox", "allow-scripts");
	const button = shown.frameLocator("section.page >> nth=0 >> iframe").getByRole("button");
	await button.click();
	await expect(button).toHaveText("clicked");

	// Note embed shows the note text.
	await expect(shown.locator("section.page").first().locator(".note")).toHaveText("Hello from a note");

	// Keys go to the frame after a click in it; give them back to the page.
	await shown.evaluate(() => (document.activeElement as HTMLElement).blur());

	// Notes toggle, and the text did not break the page.
	const notes = shown.locator("section.page").first().locator(".notes");
	await expect(notes).toBeHidden();
	await shown.keyboard.press("n");
	await expect(notes).toBeVisible();
	await expect(notes).toHaveText("First </script> notes");
	await shown.screenshot({ path: "test-results/screens/html-export.png" });

	await shown.keyboard.press("ArrowRight");
	await expect(bar).not.toHaveText(`1 / ${slides}`);
	await expect(pages.first()).toBeHidden();
	await shown.keyboard.press("ArrowLeft");
	await expect(bar).toHaveText(`1 / ${slides}`);
	await expect(pages.first()).toBeVisible();
});
