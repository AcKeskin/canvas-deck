import { expect, test } from "@playwright/test";

test("canvas renders and starts on the 16:9 frame", async ({ page }) => {
	await page.goto("/");
	await page.waitForFunction(() => window.harness.engine !== null);
	await expect(page.locator(".excalidraw canvas").first()).toBeVisible();
	await expect(page.locator(".canvas-deck-frame")).toBeVisible();
	const b = await page.evaluate(() => window.harness.engine!.camera.currentBounds());
	// Frame fits by height or width; its center is the view center.
	expect(b.x + b.width / 2).toBeCloseTo(960, 0);
	expect(b.y + b.height / 2).toBeCloseTo(540, 0);
});

test("vault image inserts and keeps its vault link", async ({ page }) => {
	await page.goto("/");
	await page.waitForFunction(() => window.harness.engine !== null);
	const images = await page.evaluate(async () => {
		await window.harness.engine!.insertImage("pics/dot.png");
		return window.harness.engine!.slide.images;
	});
	expect(Object.values(images)).toEqual(["pics/dot.png"]);
});

test("saved view round trip through the camera", async ({ page }) => {
	await page.goto("/");
	await page.waitForFunction(() => window.harness.engine !== null);
	const landed = await page.evaluate(async () => {
		const e = window.harness.engine!;
		e.setViews([{ id: "v", name: "v", bounds: { x: 4000, y: 2000, width: 800, height: 450 } }]);
		await e.camera.goToView(e.slide, "v", { duration: 200 });
		return e.camera.currentBounds();
	});
	expect(landed.x).toBeCloseTo(4000, 3);
	expect(landed.width).toBeCloseTo(800, 3);
});

test("pasted image is saved to the vault and linked", async ({ page }) => {
	await page.goto("/");
	await page.waitForFunction(() => window.harness.engine !== null);
	await page.evaluate(() => {
		const e = window.harness.engine!;
		const dataURL = window.harness.files.get("pics/dot.png")!;
		e.api.addFiles([{ id: "pasted1", dataURL, mimeType: "image/png", created: 1 } as any]);
		e.api.updateScene({
			elements: [
				...e.api.getSceneElements(),
				{ ...e.api.getSceneElements()[0], type: "image", id: "img1", fileId: "pasted1", x: 0, y: 0, width: 20, height: 10 } as any,
			].filter(Boolean),
		});
	});
	await page.waitForFunction(() => Object.keys(window.harness.engine!.slide.images).length === 1);
	const images = await page.evaluate(() => window.harness.engine!.slide.images);
	expect(images).toEqual({ pasted1: "attachments/pasted-1.png" });
});
