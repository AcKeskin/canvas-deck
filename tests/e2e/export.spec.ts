import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const shots = "test-results/screens";

test("text uses the hand-drawn font with the CDN blocked", async ({ page }) => {
	const cdn: string[] = [];
	await page.route(/esm\.sh|unpkg\.com|jsdelivr\.net/, (r) => {
		cdn.push(r.request().url());
		return r.abort();
	});
	await page.goto("/?deck");
	await page.waitForFunction(() => window.harness.engine !== null);
	await page.waitForFunction(() => [...document.fonts].some((f) => f.family === "Excalifont" && f.status === "loaded"));
	await page.waitForTimeout(500);
	const loaded = await page.evaluate(() => [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family));
	expect(loaded).toContain("Excalifont");
	expect(await page.evaluate(() => document.fonts.check("20px Excalifont", "Canvas Deck"))).toBe(true);
	expect(cdn).toEqual([]);
	await page.locator(".canvas-deck-canvas").screenshot({ path: `${shots}/offline-fonts.png` });
});

test("PDF export: one page per start frame and saved view", async ({ page }) => {
	await page.goto("/?deck");
	await page.waitForFunction(() => window.harness.engine !== null);

	const count = (pdf: Buffer) => pdf.toString("latin1").match(/\/Type \/Page\b(?!s)/g)?.length;
	const frames = Buffer.from(await page.evaluate(() => window.harness.pdf({ views: false, notes: true })), "base64");
	expect(frames.subarray(0, 5).toString()).toBe("%PDF-");
	expect(count(frames)).toBe(3);

	const all = Buffer.from(await page.evaluate(() => window.harness.pdf({ views: true, notes: true })), "base64");
	const views = await page.evaluate(() => window.harness.deck!.slides.reduce((n, s) => n + s.data.views.length, 0));
	expect(views).toBe(3);
	expect(count(all)).toBe(3 + views);
	mkdirSync("test-results", { recursive: true });
	writeFileSync("test-results/deck.pdf", all);
});
