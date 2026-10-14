import { describe, expect, test } from "vitest";
import { inkElement } from "../src/present/ink";

describe("inkElement", () => {
	test("points are relative to the first point; size covers them", () => {
		const el = inkElement({ points: [[100, 50], [110, 40], [130, 60]], pressures: [0.2, 0.5, 0.8], width: 2 });
		expect(el).toMatchObject({ type: "freedraw", x: 100, y: 50, width: 30, height: 20, strokeWidth: 2, simulatePressure: false });
		expect(el.points).toEqual([[0, 0], [10, -10], [30, 10]]);
		expect(el.pressures).toEqual([0.2, 0.5, 0.8]);
	});

	test("a tap becomes a two-point dot", () => {
		const el = inkElement({ points: [[5, 5]], pressures: [0.5], width: 1 });
		expect(el.points).toEqual([[0, 0], [0, 0]]);
		expect(el.pressures).toEqual([0.5, 0.5]);
	});
});
