import { describe, expect, test } from "vitest";
import { createSlide } from "../src/canvas/slide-data";
import type { Deck } from "../src/deck/deck-model";
import { pictureSize, planPages, wrapText } from "../src/deck/pdf-plan";
import { buildPdf } from "../src/deck/pdf-writer";

const view = (name: string, width: number, height: number) => ({ id: name, name, bounds: { x: 0, y: 0, width, height } });

function deck(): Deck {
	return {
		frontmatter: [],
		slides: [
			{ id: "a", title: "One", notes: "  say hi  ", data: { ...createSlide(), views: [view("Top", 800, 450), view("Tall", 450, 800)] } },
			{ id: "b", title: "Two", notes: "", data: createSlide() },
		],
	};
}

describe("planPages", () => {
	test("start frames only", () => {
		const pages = planPages(deck(), { views: false, notes: false });
		expect(pages.map((p) => p.title)).toEqual(["One", "Two"]);
		expect(pages[0].bounds).toEqual(createSlide().frame);
		expect(pages[0].notes).toBe("");
	});

	test("views follow their slide, notes only on the start frame", () => {
		const pages = planPages(deck(), { views: true, notes: true });
		expect(pages.map((p) => p.title)).toEqual(["One", "One: Top", "One: Tall", "Two"]);
		expect(pages.map((p) => p.slide)).toEqual([0, 0, 0, 1]);
		expect(pages.map((p) => p.notes)).toEqual(["say hi", "", "", ""]);
	});
});

describe("pictureSize", () => {
	test("keeps the aspect, 1920 wide", () => {
		expect(pictureSize({ x: 0, y: 0, width: 1920, height: 1080 })).toEqual({ width: 1920, height: 1080 });
		expect(pictureSize({ x: 5, y: 5, width: 800, height: 450 })).toEqual({ width: 1920, height: 1080 });
	});

	test("tall areas are capped in height", () => {
		expect(pictureSize({ x: 0, y: 0, width: 100, height: 1000 })).toEqual({ width: 384, height: 3840 });
	});
});

describe("wrapText", () => {
	const measure = (s: string) => s.length;

	test("breaks on words and keeps line breaks", () => {
		expect(wrapText("aaa bbb ccc\nd", 7, measure)).toEqual(["aaa bbb", "ccc", "d"]);
	});

	test("a long word stays on its own line", () => {
		expect(wrapText("x abcdefghij y", 5, measure)).toEqual(["x", "abcdefghij", "y"]);
	});
});

describe("buildPdf", () => {
	const jpeg = new Uint8Array([0xff, 0xd8, 1, 2, 3, 0xff, 0xd9]);
	const text = (b: Uint8Array) => Buffer.from(b).toString("latin1");

	test("one page per picture, page size from pixels", () => {
		const pdf = text(buildPdf([{ jpeg, width: 1920, height: 1080 }, { jpeg, width: 400, height: 800 }]));
		expect(pdf.startsWith("%PDF-1.4")).toBe(true);
		expect(pdf.trimEnd().endsWith("%%EOF")).toBe(true);
		expect(pdf.match(/\/Type \/Page\b(?!s)/g)).toHaveLength(2);
		expect(pdf).toContain("/Count 2");
		expect(pdf).toContain("/MediaBox [0 0 960 540]");
		expect(pdf).toContain("/Width 400 /Height 800");
	});

	test("xref offsets point at their objects", () => {
		const pdf = text(buildPdf([{ jpeg, width: 10, height: 10 }]));
		const xref = Number(pdf.match(/startxref\n(\d+)/)![1]);
		expect(pdf.slice(xref, xref + 4)).toBe("xref");
		const offsets = [...pdf.slice(xref).matchAll(/(\d{10}) 00000 n/g)].map((m) => Number(m[1]));
		offsets.forEach((at, i) => expect(pdf.slice(at).startsWith(`${i + 1} 0 obj`)).toBe(true));
	});
});
