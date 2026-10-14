import { describe, expect, test } from "vitest";
import type { ExcalidrawElement, FileId } from "@excalidraw/excalidraw/element/types";
import {
	createSlide,
	deserializeSlide,
	serializeSlide,
	type SlideData,
} from "../src/canvas/slide-data";

const el = (id: string, roughness: number) =>
	({ id, type: "rectangle", x: 10, y: 20, width: 100, height: 50, roughness }) as unknown as ExcalidrawElement;

function sample(): SlideData {
	return {
		...createSlide(),
		views: [
			{ id: "a", name: "Part A", bounds: { x: 0, y: 0, width: 400, height: 225 }, notes: "Look here." },
			{ id: "b", name: "Part B", bounds: { x: 3000, y: -500, width: 800, height: 450 } },
		],
		elements: [el("r1", 1), el("r2", 0)],
		images: { ["f1" as FileId]: "attachments/diagram.png" },
	};
}

describe("slide data", () => {
	test("round-trips frame, views, elements and images", () => {
		const slide = sample();
		expect(deserializeSlide(serializeSlide(slide))).toEqual(slide);
	});

	test("new slide has a 16:9 frame", () => {
		const { frame } = createSlide();
		expect(frame.width / frame.height).toBeCloseTo(16 / 9);
	});

	test("fills missing fields with defaults", () => {
		const slide = deserializeSlide('{"version":1}');
		expect(slide).toEqual(createSlide());
	});

	test("drops views with bad bounds", () => {
		const slide = deserializeSlide('{"version":1,"views":[{"id":"x","name":"x","bounds":{"x":"0"}}]}');
		expect(slide.views).toEqual([]);
	});

	test("drops view notes that are not text", () => {
		const slide = deserializeSlide('{"version":1,"views":[{"id":"x","name":"x","bounds":{"x":0,"y":0,"width":1,"height":1},"notes":5}]}');
		expect(slide.views[0]).toEqual({ id: "x", name: "x", bounds: { x: 0, y: 0, width: 1, height: 1 } });
	});

	test("rejects unknown versions", () => {
		expect(() => deserializeSlide('{"version":2}')).toThrow();
	});
});
