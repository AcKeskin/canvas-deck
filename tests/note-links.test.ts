import { describe, expect, test } from "vitest";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { formatNoteLink, isNotePath, parseNoteLink, renameNote } from "../src/canvas/note-links";
import { createSlide, type SlideData } from "../src/canvas/slide-data";

const el = (id: string, type: string, link: string | null) => ({ id, type, link }) as unknown as ExcalidrawElement;

describe("note links", () => {
	test("format and parse round trip", () => {
		const link = formatNoteLink("notes/My note.md");
		expect(link).toBe("obsidian-note:notes/My note.md");
		expect(parseNoteLink(link)).toBe("notes/My note.md");
	});

	test("other links are not notes", () => {
		expect(parseNoteLink("https://example.com")).toBeNull();
		expect(parseNoteLink("obsidian-note:")).toBeNull();
		expect(parseNoteLink(null)).toBeNull();
		expect(parseNoteLink(undefined)).toBeNull();
	});

	test("note paths", () => {
		expect(isNotePath("a/B.MD")).toBe(true);
		expect(isNotePath("a/b.png")).toBe(false);
	});

	test("rename updates matching embeds only", () => {
		const slide: SlideData = {
			...createSlide(),
			elements: [
				el("a", "embeddable", "obsidian-note:a.md"),
				el("b", "embeddable", "obsidian-note:b.md"),
				el("c", "rectangle", "obsidian-note:a.md"),
			],
		};
		const next = renameNote(slide, "a.md", "x/a.md");
		expect(next.elements.map((e) => e.link)).toEqual(["obsidian-note:x/a.md", "obsidian-note:b.md", "obsidian-note:a.md"]);
		expect(renameNote(slide, "nope.md", "x.md")).toBe(slide);
	});
});
