import { describe, expect, test } from "vitest";
import { addSlide, createDeck, deleteSlide, duplicateSlide, insertSlide, moveSlide, updateSlide } from "../src/deck/deck-model";

const titles = (d: { slides: { title: string }[] }) => d.slides.map((s) => s.title);

describe("deck model", () => {
	const d3 = addSlide(addSlide(createDeck()));

	test("add appends numbered slides", () => {
		expect(titles(d3)).toEqual(["Slide 1", "Slide 2", "Slide 3"]);
	});

	test("add after index", () => {
		expect(titles(addSlide(d3, 0))[1]).toBe("Slide 4");
	});

	test("duplicate copies data with a new id", () => {
		const d = duplicateSlide(d3, 0);
		expect(titles(d)).toEqual(["Slide 1", "Slide 1 copy", "Slide 2", "Slide 3"]);
		expect(d.slides[1].id).not.toBe(d.slides[0].id);
		expect(d.slides[1].data).not.toBe(d.slides[0].data);
	});

	test("insert puts a copy with new ids after the index", () => {
		const src = { ...d3.slides[2], data: { ...d3.slides[2].data, views: [{ id: "v1", name: "A", bounds: { x: 0, y: 0, width: 1, height: 1 } }] } };
		const d = insertSlide(d3, src, 0);
		expect(titles(d)).toEqual(["Slide 1", "Slide 3", "Slide 2", "Slide 3"]);
		expect(d.slides[1].id).not.toBe(src.id);
		expect(d.slides[1].data.views[0].id).not.toBe("v1");
		expect(d.slides[1].data.views[0].name).toBe("A");
		expect(d.slides[1].data).not.toBe(src.data);
		expect(titles(insertSlide(d3, src, 2))[3]).toBe("Slide 3");
	});

	test("delete keeps at least one slide", () => {
		expect(titles(deleteSlide(d3, 1))).toEqual(["Slide 1", "Slide 3"]);
		const one = createDeck();
		expect(deleteSlide(one, 0)).toBe(one);
	});

	test("move", () => {
		expect(titles(moveSlide(d3, 2, 0))).toEqual(["Slide 3", "Slide 1", "Slide 2"]);
	});

	test("update by id", () => {
		const id = d3.slides[1].id;
		expect(updateSlide(d3, id, { notes: "x" }).slides[1].notes).toBe("x");
	});
});
