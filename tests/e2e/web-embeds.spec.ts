import { expect, test, type Page } from "@playwright/test";

// Served by the test itself, so no test needs the internet.
const PAGE = `<!doctype html><button onclick="this.textContent='clicked'" style="width:100%;height:100vh">click me</button>`;

async function open(page: Page, path: string) {
	await page.route("**/embed-test.html", (r) => r.fulfill({ contentType: "text/html", body: PAGE }));
	await page.goto(path);
	await page.waitForFunction(() => window.harness.engine !== null);
}

const insertTestPage = (page: Page) => page.evaluate(() => window.harness.engine!.insertWebEmbed(location.origin + "/embed-test.html"));

test("inserted web embed shows the page and keeps its link", async ({ page }) => {
	await open(page, "/");
	await insertTestPage(page);
	const url = await page.evaluate(() => location.origin + "/embed-test.html");
	await expect(page.locator("iframe.canvas-deck-web")).toHaveAttribute("src", url);
	await expect(page.frameLocator("iframe.canvas-deck-web").getByRole("button")).toHaveText("click me");
	await page.waitForFunction(() => window.harness.engine!.slide.elements.some((e) => e.type === "embeddable"));
	const el = await page.evaluate(() => window.harness.engine!.slide.elements.find((e) => e.type === "embeddable")!);
	expect(el.link).toBe(url);
	expect(el.width).toBe(800);
	expect(el.height).toBe(450);
});

test("youtube link loads the embed page", async ({ page }) => {
	await page.route(/youtube\.com/, (r) => r.abort());
	await open(page, "/");
	await page.evaluate(() => window.harness.engine!.insertWebEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s"));
	await expect(page.locator("iframe.canvas-deck-web")).toHaveAttribute("src", "https://www.youtube.com/embed/dQw4w9WgXcQ?start=42");
});

test("web embed survives deck save and reload", async ({ page }) => {
	await open(page, "/?deck");
	await insertTestPage(page);
	await page.waitForFunction(() => window.harness.deck!.slides[0].data.elements.some((e) => e.type === "embeddable"));
	const md = await page.evaluate(() => window.harness.serialize(window.harness.deck!));
	const url = await page.evaluate(() => location.origin + "/embed-test.html");
	expect(md).toContain(url);

	await page.evaluate((md) => sessionStorage.setItem("deck", md), md);
	await open(page, "/?deck=stored");
	await expect(page.locator("iframe.canvas-deck-web")).toHaveAttribute("src", url);
});

test("in present mode the web embed takes clicks", async ({ page }) => {
	await open(page, "/?deck");
	await insertTestPage(page);
	await page.waitForFunction(() => window.harness.deck!.slides[0].data.elements.some((e) => e.type === "embeddable"));
	await page.getByText("▶ Present").click();
	const frame = page.locator(".canvas-deck-presenter iframe.canvas-deck-web");
	await expect(frame).toBeVisible();
	await page.waitForTimeout(300);
	const box = (await frame.boundingBox())!;
	// A real mouse click, so it only lands if the iframe takes pointer events.
	await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
	await expect(page.frameLocator(".canvas-deck-presenter iframe.canvas-deck-web").getByRole("button")).toHaveText("clicked");
	await expect(page.locator(".canvas-deck-presenter")).toBeVisible();
});
