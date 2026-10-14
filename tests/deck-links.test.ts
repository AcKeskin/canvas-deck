import { describe, expect, test } from "vitest";
import { createSlide } from "../src/canvas/slide-data";
import { deckLink, linkTargets, parseDeckLink, resolveDeckLink } from "../src/deck/deck-links";
import type { Deck } from "../src/deck/deck-model";

const bounds = { x: 0, y: 0, width: 100, height: 100 };
const deck: Deck = {
	frontmatter: [],
	slides: [
		{ id: "s1", title: "Intro", notes: "", data: createSlide() },
		{
			id: "s2",
			title: "",
			notes: "",
			data: { ...createSlide(), views: [{ id: "v1", name: "Zoom", bounds }, { id: "v2", name: "Far", bounds }] },
		},
	],
};

describe("deck links", () => {
	test("format and parse round trip", () => {
		expect(deckLink("s1")).toBe("#cdeck:s1");
		expect(deckLink("s2", "v1")).toBe("#cdeck:s2/v1");
		expect(parseDeckLink("#cdeck:s1")).toEqual({ slideId: "s1" });
		expect(parseDeckLink(" #cdeck:s2/v1 ")).toEqual({ slideId: "s2", viewId: "v1" });
	});

	test("other links are not deck links", () => {
		for (const l of [null, undefined, "", "https://x.com", "#cdeck:", "#cdeck:/v1", "#cdeck:s1/", "#cdeck:a/b/c", "cdeck:s1"]) {
			expect(parseDeckLink(l)).toBeNull();
		}
	});

	test("resolve finds slide and view, null when gone", () => {
		expect(resolveDeckLink(deck, "s1")).toEqual({ slide: 0, view: -1 });
		expect(resolveDeckLink(deck, "s2", "v2")).toEqual({ slide: 1, view: 1 });
		expect(resolveDeckLink(deck, "nope")).toBeNull();
		expect(resolveDeckLink(deck, "s2", "nope")).toBeNull();
	});

	test("targets list slides then their views", () => {
		expect(linkTargets(deck)).toEqual([
			{ label: "Slide 1: Intro", link: "#cdeck:s1" },
			{ label: "Slide 2: Untitled", link: "#cdeck:s2" },
			{ label: "Slide 2: Untitled › Zoom", link: "#cdeck:s2/v1" },
			{ label: "Slide 2: Untitled › Far", link: "#cdeck:s2/v2" },
		]);
	});
});
