import type { Bounds } from "../canvas/slide-data";
import type { Deck } from "./deck-model";

export interface PdfOptions {
	/** Add a page for each saved view after the slide's start frame. */
	views: boolean;
	/** Print speaker notes under the start frame picture. */
	notes: boolean;
}

export interface PdfPage {
	slide: number;
	title: string;
	/** Scene area shown on the page. */
	bounds: Bounds;
	/** Empty when the page has no notes. */
	notes: string;
}

/** Pages in deck order: each slide's start frame, then its saved views if asked. */
export function planPages(deck: Deck, opts: PdfOptions): PdfPage[] {
	const pages: PdfPage[] = [];
	deck.slides.forEach((s, i) => {
		pages.push({ slide: i, title: s.title, bounds: s.data.frame, notes: opts.notes ? s.notes.trim() : "" });
		if (!opts.views) return;
		for (const v of s.data.views) pages.push({ slide: i, title: `${s.title}: ${v.name}`, bounds: v.bounds, notes: "" });
	});
	return pages;
}

/** Picture size in pixels, at the bounds' aspect: 1920 wide, but never taller than 3840. */
export function pictureSize(b: Bounds): { width: number; height: number } {
	const s = Math.min(1920 / Math.max(b.width, 1), 3840 / Math.max(b.height, 1));
	return { width: Math.max(1, Math.round(b.width * s)), height: Math.max(1, Math.round(b.height * s)) };
}

/** Breaks text into lines no wider than `maxWidth`. Keeps the text's own line breaks. */
export function wrapText(text: string, maxWidth: number, measure: (s: string) => number): string[] {
	const lines: string[] = [];
	for (const para of text.split("\n")) {
		let line = "";
		for (const word of para.split(/\s+/).filter(Boolean)) {
			const next = line ? `${line} ${word}` : word;
			if (line && measure(next) > maxWidth) {
				lines.push(line);
				line = word;
			} else line = next;
		}
		lines.push(line);
	}
	return lines;
}
