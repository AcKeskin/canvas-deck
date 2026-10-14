import { describe, expect, test } from "vitest";
import { next, prev, type Position } from "../src/present/stepper";

// Slide 0 has no views, slide 1 has two, slide 2 has none.
const shape = [0, 2, 0];

function walk(step: typeof next, from: Position, n: number) {
	const out = [from];
	for (let i = 0; i < n; i++) out.push(step(out[out.length - 1], shape));
	return out.map((p) => `${p.slide}:${p.view}`);
}

describe("stepper", () => {
	test("next goes through views, then slides, then stops", () => {
		expect(walk(next, { slide: 0, view: -1 }, 5)).toEqual(["0:-1", "1:-1", "1:0", "1:1", "2:-1", "2:-1"]);
	});

	test("prev walks back to each frame", () => {
		expect(walk(prev, { slide: 2, view: -1 }, 5)).toEqual(["2:-1", "1:-1", "0:-1", "0:-1", "0:-1", "0:-1"]);
		expect(walk(prev, { slide: 1, view: 1 }, 3)).toEqual(["1:1", "1:0", "1:-1", "0:-1"]);
	});
});
