import type { ImageStore } from "../canvas/engine";
import type { Deck } from "./deck-model";
import { buildDeckHtml } from "./html-page";
import { planHtmlPages } from "./html-plan";
import { loadFiles, renderPicture } from "./pdf-render";

/** Rendered HTML of a vault note, for note embeds. */
export type NoteHtml = (path: string) => Promise<string>;

/** Draws every page of the deck to a picture and returns one standalone HTML file. */
export async function renderDeckHtml(title: string, deck: Deck, images: ImageStore, noteHtml: NoteHtml): Promise<string> {
	const pages = planHtmlPages(deck);
	const cache = new Map<string, string | null>();
	const pictures: string[] = [];
	const notes = new Map<string, string>();
	for (const page of pages) {
		const data = deck.slides[page.slide].data;
		const picture = await renderPicture(data, page.bounds, await loadFiles(data, images, cache));
		// WebP keeps line drawings sharp and small. Browsers without it fall back to PNG.
		pictures.push(picture.toDataURL("image/webp", 0.9));
		for (const o of page.overlays) if (o.kind === "note" && !notes.has(o.path)) notes.set(o.path, await noteHtml(o.path));
	}
	return buildDeckHtml(title, deck.slides.length, pages, pictures, notes);
}
