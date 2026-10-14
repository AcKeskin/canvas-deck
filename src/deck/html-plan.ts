import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { codeSource, isCodeLink } from "../canvas/code-cards";
import { parseNoteLink } from "../canvas/note-links";
import type { Bounds } from "../canvas/slide-data";
import { isWebLink, webEmbedSrc } from "../canvas/web-embeds";
import type { Deck } from "./deck-model";

/** What a live embed shows. */
export type Embed = { kind: "note"; path: string } | { kind: "web"; src: string } | { kind: "code"; source: string };

/** A live embed drawn over the page picture. Position and size are percent of the page. */
export type Overlay = Embed & { left: number; top: number; width: number; height: number };

export interface HtmlPage {
	slide: number;
	title: string;
	/** Saved view name, or null for the start frame. */
	view: string | null;
	bounds: Bounds;
	/** Empty when the page has no notes. */
	notes: string;
	overlays: Overlay[];
}

/** Pages in present order: each slide's start frame, then its saved views. */
export function planHtmlPages(deck: Deck): HtmlPage[] {
	const pages: HtmlPage[] = [];
	deck.slides.forEach((s, i) => {
		const page = (view: string | null, bounds: Bounds, notes: string) =>
			pages.push({ slide: i, title: s.title, view, bounds, notes: notes.trim(), overlays: overlays(s.data.elements, bounds) });
		page(null, s.data.frame, s.notes);
		// Same choice as the presenter: the view's own notes, else the slide's.
		for (const v of s.data.views) page(v.name, v.bounds, v.notes?.trim() || s.notes);
	});
	return pages;
}

/** Embeds that touch the page, cut to the page edges. */
export function overlays(elements: readonly ExcalidrawElement[], b: Bounds): Overlay[] {
	const out: Overlay[] = [];
	for (const el of elements) {
		if (el.type !== "embeddable" || el.isDeleted) continue;
		const embed = embedOf(el);
		if (!embed) continue;
		const x0 = Math.max(el.x, b.x);
		const y0 = Math.max(el.y, b.y);
		const x1 = Math.min(el.x + el.width, b.x + b.width);
		const y1 = Math.min(el.y + el.height, b.y + b.height);
		if (x1 <= x0 || y1 <= y0) continue;
		out.push({
			...embed,
			left: pct(x0 - b.x, b.width),
			top: pct(y0 - b.y, b.height),
			width: pct(x1 - x0, b.width),
			height: pct(y1 - y0, b.height),
		});
	}
	return out;
}

function pct(v: number, of: number): number {
	return Math.round((v / of) * 1e5) / 1e3;
}

/** What an embeddable shows, from its link. Null for kinds we can't show. */
export function embedOf(el: ExcalidrawElement): Embed | null {
	if (isCodeLink(el.link)) return { kind: "code", source: codeSource(el) };
	const path = parseNoteLink(el.link);
	if (path) return { kind: "note", path };
	if (isWebLink(el.link)) return { kind: "web", src: webEmbedSrc(el.link) };
	return null;
}

