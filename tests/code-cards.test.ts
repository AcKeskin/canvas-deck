import { describe, expect, test } from "vitest";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { CODE_LINK, codeSource, codeSrcdoc, isCodeLink } from "../src/canvas/code-cards";
import { createSlide } from "../src/canvas/slide-data";
import { parseDeck, serializeDeck } from "../src/deck/deck-format";
import { createDeck } from "../src/deck/deck-model";

const card = (customData?: Record<string, unknown>) => ({ id: "c", type: "embeddable", link: CODE_LINK, customData }) as unknown as ExcalidrawElement;

describe("code cards", () => {
	test("only the exact link is a code card", () => {
		expect(isCodeLink("canvas-deck-code:")).toBe(true);
		expect(isCodeLink("canvas-deck-code:x")).toBe(false);
		expect(isCodeLink("obsidian-note:a.md")).toBe(false);
		expect(isCodeLink(null)).toBe(false);
		expect(isCodeLink(undefined)).toBe(false);
	});

	test("source is a string or empty", () => {
		expect(codeSource(card({ source: "<b>hi</b>" }))).toBe("<b>hi</b>");
		expect(codeSource(card())).toBe("");
		expect(codeSource(card({ source: 42 }))).toBe("");
	});

	test("srcdoc keeps the source after the default style", () => {
		const doc = codeSrcdoc("<p>x</p>");
		expect(doc.endsWith("<p>x</p>")).toBe(true);
		expect(doc.indexOf("<style>")).toBeLessThan(doc.indexOf("<p>x</p>"));
	});

	test("source survives deck save and load", () => {
		const source = '<p class="a">"%%" here\n%%\n</p>\n<script>\n\tlet n = 0;\n</script>';
		const deck = createDeck();
		deck.slides[0].data = { ...createSlide(), elements: [card({ source })] };
		const back = parseDeck(serializeDeck(deck));
		expect(codeSource(back.slides[0].data.elements[0])).toBe(source);
		expect(back.slides[0].data.elements[0].link).toBe(CODE_LINK);
	});
});
