import { test, type Page } from "@playwright/test";

// README screenshots. Run with: SHOTS=1 npx playwright test readme-shots
test.skip(!process.env.SHOTS, "set SHOTS=1 to update README screenshots");
test.use({ viewport: { width: 1280, height: 720 } });

const out = "docs/screens";

async function openDeck(page: Page) {
	await page.goto("/?deck");
	await page.waitForFunction(() => window.harness.engine !== null);
	await page.waitForTimeout(2500); // fonts and thumbnails
}

async function present(page: Page) {
	await page.getByText("▶ Present").click();
	await page.waitForTimeout(1200);
}

test("editor", async ({ page }) => {
	await openDeck(page);
	await page.locator(".canvas-deck-list-item").nth(1).click();
	await page.waitForTimeout(1500);
	await page.screenshot({ path: `${out}/editor.png` });

	await page.locator(".canvas-deck-list-item").nth(2).click();
	await page.waitForFunction(() => window.harness.engine?.slide.views.length === 3);
	await page.locator(".canvas-deck-view-chip").getByText("Middle").click();
	await page.waitForTimeout(2000);
	await page.screenshot({ path: `${out}/saved-views.png` });
});

test("present with pen", async ({ page }) => {
	await openDeck(page);
	await present(page);
	await page.keyboard.press("p");
	// Circle the title.
	const cx = 640, cy = 330, rx = 330, ry = 90;
	await page.mouse.move(cx + rx, cy);
	await page.mouse.down();
	for (let i = 1; i <= 60; i++) {
		const a = (i / 60) * Math.PI * 2.1;
		await page.mouse.move(cx + rx * Math.cos(a), cy + ry * Math.sin(a));
	}
	await page.mouse.up();
	await page.mouse.move(900, 600);
	await page.waitForTimeout(300);
	await page.screenshot({ path: `${out}/present-pen.png` });
});

test("grid and keys", async ({ page }) => {
	await openDeck(page);
	await present(page);
	await page.keyboard.press("g");
	await page.waitForTimeout(2000);
	await page.screenshot({ path: `${out}/grid.png`, clip: { x: 0, y: 0, width: 780, height: 270 } });
	await page.keyboard.press("Escape");
	await page.keyboard.press("?");
	await page.waitForTimeout(300);
	await page.screenshot({ path: `${out}/keys.png` });
});

test("web embed and code card in present mode", async ({ page }) => {
	await openDeck(page);
	await page.evaluate(() =>
		window.harness.handle!.insertSlide({
			id: "embeds",
			title: "Live embeds",
			notes: "",
			data: { version: 1, frame: { x: 0, y: 0, width: 1920, height: 1080 }, views: [], elements: [], images: {} },
		}),
	);
	await page.waitForFunction(() => window.harness.engine?.slide.elements.length === 0);
	await page.evaluate((bars) => {
		const e = window.harness.engine!;
		e.addElements([{ id: "title", type: "text", x: 160, y: 120, width: 1500, height: 80, text: "A web page and a code card, live on the slide", fontSize: 64, fontFamily: 5, originalText: "A web page and a code card, live on the slide" }]);
		e.refreshText();
		e.insertWebEmbed("https://en.wikipedia.org/wiki/Presentation", { x: 600, y: 600 });
		e.insertCodeCard(bars, { x: 1440, y: 600 });
	}, BARS);
	await present(page);
	await page.waitForTimeout(4000); // the web page loads
	await page.screenshot({ path: `${out}/embeds.png` });
});

const BARS = `<div id="bars" style="display:flex;align-items:flex-end;gap:10px;height:200px"></div>
<button style="margin-top:16px;font-size:18px">Shuffle</button>
<script>
	const colors = ["#a5d8ff", "#b2f2bb", "#ffec99", "#ffc9c9", "#d0bfff"];
	const bars = document.getElementById("bars");
	function draw() {
		bars.innerHTML = colors.map((c) => \`<div style="width:56px;height:\${30 + Math.random() * 170}px;background:\${c};border-radius:6px"></div>\`).join("");
	}
	document.querySelector("button").onclick = draw;
	draw();
</script>`;
