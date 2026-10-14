import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { describe, expect, test } from "vitest";
import { createSlide } from "../src/canvas/slide-data";
import type { Deck } from "../src/deck/deck-model";
import { buildDeckHtml, escapeHtml } from "../src/deck/html-page";
import { embedOf, overlays, planHtmlPages } from "../src/deck/html-plan";

const view = (name: string, notes?: string) => ({ id: name, name, bounds: { x: 0, y: 0, width: 800, height: 450 }, notes });

const embed = (link: string | null, x = 0, y = 0, width = 100, height = 100, extra: object = {}) =>
	({ type: "embeddable", link, x, y, width, height, isDeleted: false, ...extra }) as unknown as ExcalidrawElement;

function deck(): Deck {
	return {
		frontmatter: [],
		slides: [
			{ id: "a", title: "One", notes: " slide notes ", data: { ...createSlide(), views: [view("Top", "view notes"), view("Bare")] } },
			{ id: "b", title: "Two", notes: "", data: createSlide() },
		],
	};
}

describe("planHtmlPages", () => {
	test("start frame, then views, slide by slide", () => {
		const pages = planHtmlPages(deck());
		expect(pages.map((p) => [p.slide, p.view])).toEqual([
			[0, null],
			[0, "Top"],
			[0, "Bare"],
			[1, null],
		]);
		expect(pages[0].bounds).toEqual(createSlide().frame);
	});

	test("a view's own notes, else the slide's", () => {
		expect(planHtmlPages(deck()).map((p) => p.notes)).toEqual(["slide notes", "view notes", "slide notes", ""]);
	});
});

describe("embedOf", () => {
	test("note, web and code links", () => {
		expect(embedOf(embed("obsidian-note:notes/a.md"))).toEqual({ kind: "note", path: "notes/a.md" });
		expect(embedOf(embed("https://example.com/x"))).toEqual({ kind: "web", src: "https://example.com/x" });
		expect(embedOf(embed("http://example.com"))).toEqual({ kind: "web", src: "http://example.com" });
		expect(embedOf(embed("https://youtu.be/abc123"))).toEqual({ kind: "web", src: "https://www.youtube.com/embed/abc123" });
		expect(embedOf(embed("canvas-deck-code:", 0, 0, 1, 1, { customData: { source: "<b>hi</b>" } }))).toEqual({
			kind: "code",
			source: "<b>hi</b>",
		});
	});

	test("anything else shows nothing", () => {
		expect(embedOf(embed(null))).toBeNull();
		expect(embedOf(embed("#cdeck:abc"))).toBeNull();
		expect(embedOf(embed("javascript:alert(1)"))).toBeNull();
	});
});

describe("overlays", () => {
	const page = { x: 100, y: 100, width: 1000, height: 500 };

	test("percent of the page", () => {
		const [o] = overlays([embed("https://a.b", 200, 150, 500, 250)], page);
		expect(o).toMatchObject({ left: 10, top: 10, width: 50, height: 50 });
	});

	test("cut to the page edges", () => {
		const [o] = overlays([embed("https://a.b", 0, 500, 300, 300)], page);
		expect(o).toMatchObject({ left: 0, top: 80, width: 20, height: 20 });
	});

	test("skips embeds off the page, deleted ones and other elements", () => {
		const rect = { ...embed("https://a.b", 200, 200), type: "rectangle" } as ExcalidrawElement;
		const deleted = { ...embed("https://a.b", 200, 200), isDeleted: true } as ExcalidrawElement;
		expect(overlays([embed("https://a.b", 2000, 2000), embed("https://a.b", 0, 0, 100, 100), rect, deleted], page)).toEqual([]);
	});
});

describe("buildDeckHtml", () => {
	test("escapes text", () => {
		expect(escapeHtml(`<a href="x">&'</a>`)).toBe("&#60;a href=&#34;x&#34;&#62;&#38;&#39;&#60;/a&#62;");
	});

	test("one section per page, notes can't break the page", () => {
		const d = deck();
		d.slides[0].notes = "</script><script>alert(1)</script>";
		d.slides[0].title = `<img src=x onerror="alert(1)">`;
		d.slides[0].data = {
			...d.slides[0].data,
			elements: [embed("canvas-deck-code:", 0, 0, 100, 100, { customData: { source: `<p class="a">"hi"</p>` } })],
		};
		const pages = planHtmlPages(d);
		const html = buildDeckHtml("Deck <1>", 2, pages, ["data:a", "data:b", "data:c", "data:d"], new Map());
		expect(html.match(/<section /g)).toHaveLength(4);
		expect(html.match(/<script>/g)).toHaveLength(1);
		expect(html.match(/<\/script>/g)).toHaveLength(1);
		expect(html).not.toContain("<img src=x");
		expect(html).toContain("<title>Deck &#60;1&#62;</title>");
		expect(html).toContain(`sandbox="allow-scripts" data-srcdoc="&#60;!doctype html&#62;`);
		expect(html).toContain(`&#60;p class=&#34;a&#34;&#62;&#34;hi&#34;&#60;/p&#62;"`);
		expect(html).not.toContain("allow-same-origin");
	});

	test("note embeds get their rendered HTML", () => {
		const d = deck();
		d.slides[1].data = { ...d.slides[1].data, elements: [embed("obsidian-note:n.md")] };
		const html = buildDeckHtml("D", 2, planHtmlPages(d), ["", "", "", ""], new Map([["n.md", "<p>Hello</p>"]]));
		expect(html).toContain(`<div class="embed note" style="left: 0%; top: 0%; width: 5.208%; height: 9.259%"><p>Hello</p></div>`);
	});
});
