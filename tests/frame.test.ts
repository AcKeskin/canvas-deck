import { describe, expect, test } from "vitest";
import { aspectOf, aspectRatio, frameWithAspect, moveFrame, resizeFrame } from "../src/canvas/frame";
import { createSlide } from "../src/canvas/slide-data";

const f = createSlide().frame;

describe("frame", () => {
	test("aspect ratios", () => {
		expect(aspectRatio("16:9")).toBeCloseTo(16 / 9);
		expect(aspectRatio("9:16")).toBeCloseTo(9 / 16);
		expect(aspectRatio("free")).toBeNull();
	});

	test("aspectOf names the frame's aspect", () => {
		expect(aspectOf(f)).toBe("16:9");
		expect(aspectOf({ x: 0, y: 0, width: 800, height: 600 })).toBe("4:3");
		expect(aspectOf({ x: 0, y: 0, width: 500, height: 300 })).toBe("free");
	});

	test("frameWithAspect keeps center and about the same area", () => {
		for (const a of ["4:3", "1:1", "9:16"] as const) {
			const g = frameWithAspect(f, a);
			expect(aspectOf(g)).toBe(a);
			expect(Math.abs(g.x + g.width / 2 - (f.x + f.width / 2))).toBeLessThan(1);
			expect(Math.abs(g.y + g.height / 2 - (f.y + f.height / 2))).toBeLessThan(1);
			expect((g.width * g.height) / (f.width * f.height)).toBeCloseTo(1, 2);
		}
		expect(frameWithAspect(f, "free")).toBe(f);
		expect(frameWithAspect(f, "16:9")).toEqual(f);
	});

	test("move", () => {
		expect(moveFrame(f, 10, -5)).toEqual({ ...f, x: 10, y: -5 });
	});

	test("free resize moves only the dragged corner", () => {
		expect(resizeFrame(f, "se", 100, 50, null)).toEqual({ x: 0, y: 0, width: 2020, height: 1130 });
		expect(resizeFrame(f, "nw", 100, 50, null)).toEqual({ x: 100, y: 50, width: 1820, height: 1030 });
	});

	test("resize keeps the ratio and the opposite corner", () => {
		const g = resizeFrame(f, "nw", -192, 0, 16 / 9);
		expect(g.width / g.height).toBeCloseTo(16 / 9);
		expect(g.x + g.width).toBeCloseTo(f.width);
		expect(g.y + g.height).toBeCloseTo(f.height);
		expect(g.width).toBeCloseTo(2112);
	});

	test("resize never goes below the minimum", () => {
		expect(resizeFrame(f, "se", -5000, -5000, null)).toEqual({ x: 0, y: 0, width: 40, height: 40 });
		const g = resizeFrame(f, "se", -5000, -5000, 2);
		expect(g.width / g.height).toBeCloseTo(2);
		expect(g.height).toBeGreaterThanOrEqual(40);
	});
});
