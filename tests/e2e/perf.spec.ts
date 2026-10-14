import { expect, test, type Page } from "@playwright/test";

const N = Number(process.env.PERF_N ?? 2000);

/** Counts frames in the page while `drive` runs. */
async function fpsWhile(page: Page, drive: () => Promise<void>) {
	await page.evaluate(() => {
		const w = window as any;
		w.__frames = 0;
		w.__start = performance.now();
		w.__run = true;
		const tick = () => {
			w.__frames++;
			if (w.__run) requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);
	});
	await drive();
	return page.evaluate(() => {
		const w = window as any;
		w.__run = false;
		return (w.__frames * 1000) / (performance.now() - w.__start);
	});
}

/** Real wheel input: pans, then ctrl+wheel zooms out and back in, for `ms`. */
async function panAndZoom(page: Page, ms: number) {
	await page.mouse.move(800, 450);
	const end = Date.now() + ms;
	let i = 0;
	while (Date.now() < end) {
		const phase = Math.floor(i / 40) % 3;
		if (phase === 0) await page.mouse.wheel(60, 30);
		else {
			await page.keyboard.down("Control");
			await page.mouse.wheel(0, phase === 1 ? 20 : -20);
			await page.keyboard.up("Control");
		}
		i++;
	}
}

/** Camera animation between saved views, as in present mode. */
async function animateViews(page: Page, ms: number) {
	await page.evaluate(async (ms) => {
		const e = window.harness.engine!;
		e.setViews([
			{ id: "a", name: "a", bounds: { x: 0, y: 0, width: 1600, height: 900 } },
			{ id: "b", name: "b", bounds: { x: 4000, y: 3000, width: 6400, height: 3600 } },
		]);
		const end = performance.now() + ms;
		for (let k = 0; performance.now() < end; k++) await e.camera.goToView(e.slide, k % 2 ? "a" : "b", { duration: 600 });
	}, ms);
}

async function openPerfSlide(page: Page) {
	await page.goto(`/?perf=${N}`);
	await page.waitForFunction(() => window.harness.engine !== null);
	expect(await page.evaluate(() => window.harness.engine!.api.getSceneElements().length)).toBeGreaterThanOrEqual(N);
	await panAndZoom(page, 500); // warm up shape caches
	// Camera animations use a pre-rendered picture once it's ready (a second or two after load).
	await page.waitForFunction(() => window.harness.engine!.motionReady, null, { timeout: 30_000 });
}

for (const cpu of [1, 4]) {
	const min = cpu === 1 ? 50 : 30;
	const label = cpu === 1 ? "desktop" : "mobile-like (4x slower CPU)";

	test(`${N} objects, ${label}: wheel pan/zoom >= ${min} fps`, async ({ page }) => {
		await openPerfSlide(page);
		if (cpu > 1) await (await page.context().newCDPSession(page)).send("Emulation.setCPUThrottlingRate", { rate: cpu });
		const fps = await fpsWhile(page, () => panAndZoom(page, 3000));
		console.log(`${label} wheel fps: ${fps.toFixed(1)}`);
		expect(fps).toBeGreaterThanOrEqual(min);
	});

	test(`${N} objects, ${label}: view animation >= ${min} fps`, async ({ page }) => {
		await openPerfSlide(page);
		if (cpu > 1) await (await page.context().newCDPSession(page)).send("Emulation.setCPUThrottlingRate", { rate: cpu });
		const fps = await fpsWhile(page, () => animateViews(page, 3000));
		console.log(`${label} animation fps: ${fps.toFixed(1)}`);
		expect(fps).toBeGreaterThanOrEqual(min);
	});
}
