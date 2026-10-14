import { describe, expect, test } from "vitest";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { createSlide } from "../src/canvas/slide-data";
import { isDeckText, parseDeck, serializeDeck } from "../src/deck/deck-format";
import type { Deck } from "../src/deck/deck-model";

const rect = { id: "r", type: "rectangle", x: 1, y: 2, width: 3, height: 4, roughness: 0 } as unknown as ExcalidrawElement;

const deck: Deck = {
	frontmatter: ["tags: [talk]"],
	slides: [
		{ id: "a", title: "Intro", notes: "Say hi.\n\n### Sub heading\n- point with %% inside", data: { ...createSlide(), elements: [rect] } },
		{
			id: "b",
			title: "Big diagram",
			notes: "",
			data: { ...createSlide(), views: [{ id: "v", name: "Zoom A", bounds: { x: 0, y: 0, width: 10, height: 10 } }] },
		},
	],
};

describe("deck format", () => {
	test("round-trips slides, notes, data and extra frontmatter", () => {
		expect(parseDeck(serializeDeck(deck))).toEqual(deck);
	});

	test("titles and notes are plain text, data is in %% blocks", () => {
		const md = serializeDeck(deck);
		expect(md).toContain("## Intro\n\nSay hi.");
		expect(md).toContain("## Big diagram");
		const outsideBlocks = md.replace(/%%cdeck[^\n]*\n[^\n]*\n%%/g, "");
		expect(outsideBlocks).not.toContain('"elements"');
	});

	test("flag detection", () => {
		expect(isDeckText(serializeDeck(deck))).toBe(true);
		expect(isDeckText("---\ntags: x\n---\nhi")).toBe(false);
		expect(isDeckText("no frontmatter")).toBe(false);
	});

	test("a flagged note with no slides becomes one slide with its text as notes", () => {
		const d = parseDeck("---\ncanvas-deck: 1\n---\nsome text");
		expect(d.slides).toHaveLength(1);
		expect(d.slides[0].notes).toBe("some text");
	});

	test("text after the last block is kept", () => {
		const d = parseDeck(serializeDeck(deck) + "\nlate note\n");
		expect(d.slides[1].notes).toBe("late note");
	});

	test("rejects newer format versions", () => {
		expect(() => parseDeck("---\ncanvas-deck: 99\n---\n")).toThrow();
	});
});
