import { expect, test, type Page } from "@playwright/test";

/** Draws one flat pen stroke with fixed pressure through real browser input; returns the stroke. */
async function penStroke(page: Page, y: number, pressure: number) {
	const cdp = await page.context().newCDPSession(page);
	const send = (type: string, x: number, buttons: number) =>
		cdp.send("Input.dispatchMouseEvent", {
			type,
			x,
			y,
			button: "left",
			buttons,
			clickCount: 1,
			pointerType: "pen",
			force: pressure,
		} as any);
	await send("mousePressed", 300, 1);
	for (let x = 310; x <= 700; x += 10) await send("mouseMoved", x, 1);
	await send("mouseReleased", 700, 0);
	await page.waitForTimeout(50);
	return page.evaluate(() => {
		const els = window.harness.engine!.api.getSceneElements();
		const el = els[els.length - 1] as any;
		// The stroke renders as a filled outline; for a flat line its height is the thickness.
		const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
		path.setAttribute("d", window.harness.freeDrawPath(el));
		svg.appendChild(path);
		document.body.appendChild(svg);
		const thickness = path.getBBox().height;
		svg.remove();
		return { type: el.type, simulatePressure: el.simulatePressure, pressures: el.pressures as number[], thickness };
	});
}

test("pen pressure changes stroke width", async ({ page }) => {
	await page.goto("/");
	await page.waitForFunction(() => window.harness.engine !== null);
	await page.evaluate(() => window.harness.engine!.api.setActiveTool({ type: "freedraw" }));
	const light = await penStroke(page, 300, 0.1);
	const heavy = await penStroke(page, 500, 0.9);
	expect(light.type).toBe("freedraw");
	expect(light.simulatePressure).toBe(false);
	expect(light.pressures.length).toBeGreaterThan(10);
	expect(light.pressures[5]).toBeCloseTo(0.1, 2);
	expect(heavy.thickness).toBeGreaterThan(light.thickness * 1.5);
});
