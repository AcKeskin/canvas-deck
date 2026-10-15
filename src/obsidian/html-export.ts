import { Component, MarkdownRenderer, Notice, type App, type TFile } from "obsidian";
import type { ImageStore } from "../canvas/engine";
import type { Deck } from "../deck/deck-model";
import { escapeHtml } from "../deck/html-page";
import { renderDeckHtml } from "../deck/html-render";

/** Saves `<deck name>.html` next to the deck note: a present mode that runs in any browser. */
export async function exportDeckHtml(app: App, file: TFile, deck: Deck, images: ImageStore) {
	const notice = new Notice("Canvas Deck: exporting HTML…", 0);
	try {
		const html = await renderDeckHtml(file.basename, deck, images, (path) => noteHtml(app, path));
		const path = file.path.replace(/\.md$/, ".html");
		const existing = app.vault.getFileByPath(path);
		if (existing) await app.vault.modify(existing, html);
		else await app.vault.create(path, html);
		new Notice(`Canvas Deck: saved ${path}`);
	} catch (e) {
		new Notice(`Canvas Deck: HTML export failed. ${(e as Error).message}`);
	} finally {
		notice.hide();
	}
}

/** A note rendered once to static HTML. */
async function noteHtml(app: App, path: string): Promise<string> {
	const file = app.vault.getFileByPath(path);
	if (!file) return escapeHtml(`Note not found: ${path}`);
	const el = createDiv();
	const comp = new Component();
	comp.load();
	try {
		await MarkdownRenderer.render(app, await app.vault.cachedRead(file), el, path, comp);
		return el.innerHTML;
	} finally {
		comp.unload();
	}
}
