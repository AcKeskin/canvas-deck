import { Notice, TextFileView } from "obsidian";
import { createRoot, type Root } from "react-dom/client";
import { isImagePath, pathFromDragText, renameImage } from "../canvas/vault-images";
import { vaultImageStore } from "../obsidian/vault-image-store";
import type { CanvasEngine } from "../canvas/engine";
import { parseDeck, serializeDeck } from "./deck-format";
import { DeckEditor, type DeckHandle } from "./DeckEditor";
import type { Deck } from "./deck-model";

export const DECK_VIEW = "canvas-deck";

/** Opens deck notes (markdown with canvas-deck frontmatter) in the deck editor. */
export class DeckView extends TextFileView {
	handle: DeckHandle | null = null;
	engine: CanvasEngine | null = null;
	private root: Root | null = null;
	private deck: Deck | null = null;
	private lastData = "";
	private images = vaultImageStore(this.app, () => this.file?.path);

	getViewType() {
		return DECK_VIEW;
	}

	getDisplayText() {
		return this.file?.basename ?? "Deck";
	}

	getIcon() {
		return "presentation";
	}

	getViewData(): string {
		return this.deck ? serializeDeck(this.deck) : this.data;
	}

	/** Also called when the file changes on disk; reloads unless it's our own last save. */
	setViewData(data: string, clear: boolean) {
		if (!clear && data === this.lastData) return;
		try {
			this.deck = parseDeck(data);
		} catch (e) {
			// Drop the old deck so a save can't write it over the file.
			this.deck = null;
			this.unmount();
			new Notice(`Canvas Deck: ${(e as Error).message}. Use "Open deck as markdown" to fix it.`);
			return;
		}
		this.lastData = data;
		this.mount();
	}

	clear() {
		this.deck = null;
		this.unmount();
	}

	async save(clear?: boolean) {
		await super.save(clear);
		this.lastData = this.getViewData();
	}

	async onOpen() {
		this.contentEl.addClass("canvas-deck-view");
		this.contentEl.style.padding = "0";
		this.registerDomEvent(this.contentEl, "drop", (e) => this.onDrop(e), { capture: true });
	}

	async onClose() {
		this.unmount();
	}

	/** Updates image links after a vault rename. */
	renameImage(oldPath: string, newPath: string) {
		if (!this.deck) return;
		let changed = false;
		const slides = this.deck.slides.map((s) => {
			const data = renameImage(s.data, oldPath, newPath);
			if (data !== s.data) changed = true;
			return data === s.data ? s : { ...s, data };
		});
		if (!changed) return;
		this.deck = { ...this.deck, slides };
		this.requestSave();
		this.mount();
	}

	private mount() {
		this.unmount();
		if (!this.deck) return;
		this.root = createRoot(this.contentEl);
		this.root.render(
			<DeckEditor
				initial={this.deck}
				images={this.images}
				theme={document.body.hasClass("theme-dark") ? "dark" : "light"}
				onChange={(d) => {
					this.deck = d;
					this.requestSave();
				}}
				onReady={(h) => (this.handle = h)}
				onEngine={(e) => (this.engine = e)}
			/>,
		);
	}

	private unmount() {
		this.root?.unmount();
		this.root = null;
		this.handle = null;
		this.engine = null;
	}

	/** Dropping a vault image from the file explorer links it instead of copying. */
	private onDrop(e: DragEvent) {
		const text = e.dataTransfer?.getData("text/plain");
		if (!text || !this.engine || e.dataTransfer?.files.length) return;
		const path = pathFromDragText(text);
		if (!path || !isImagePath(path)) return;
		const file = this.app.metadataCache.getFirstLinkpathDest(path, this.file?.path ?? "") ?? this.app.vault.getFileByPath(path);
		if (!file) return;
		e.preventDefault();
		e.stopPropagation();
		this.engine.insertImage(file.path, this.engine.sceneAt(e.clientX, e.clientY));
	}
}
