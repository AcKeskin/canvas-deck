import { arrayBufferToBase64, base64ToArrayBuffer, TextFileView, TFile, type WorkspaceLeaf } from "obsidian";
import { createRoot, type Root } from "react-dom/client";
import type { CanvasEngine, ImageStore } from "./engine";
import { SlideCanvas } from "./SlideCanvas";
import { createSlide, deserializeSlide, serializeSlide, type SlideData } from "./slide-data";
import { extFromMime, isImagePath, mimeOf, pathFromDragText } from "./vault-images";

export const VIEW_TYPE = "canvas-deck-slide";
export const SLIDE_EXTENSION = "cslide";

/** Obsidian view for a single-slide file. deck-store will replace the file format later. */
export class SlideView extends TextFileView {
	engine: CanvasEngine | null = null;
	private root: Root | null = null;
	private slide: SlideData = createSlide();
	private readOnly = false;
	viewIndex = -1;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType() {
		return VIEW_TYPE;
	}

	getDisplayText() {
		return this.file?.basename ?? "Slide";
	}

	getIcon() {
		return "presentation";
	}

	getViewData(): string {
		return serializeSlide(this.engine?.slide ?? this.slide);
	}

	setViewData(data: string, clear: boolean) {
		if (!clear && this.root) return;
		this.slide = data.trim() ? deserializeSlide(data) : createSlide();
		this.mount();
	}

	clear() {
		this.unmount();
	}

	async onOpen() {
		this.contentEl.addClass("canvas-deck-view");
		this.registerDomEvent(this.contentEl, "drop", (e) => this.onDrop(e), { capture: true });
	}

	async onClose() {
		this.unmount();
	}

	setReadOnly(readOnly: boolean) {
		this.readOnly = readOnly;
		this.engine?.camera.setReadOnly(readOnly);
	}

	private mount() {
		this.unmount();
		this.root = createRoot(this.contentEl);
		this.root.render(
			<SlideCanvas
				initial={this.slide}
				images={this.imageStore}
				readOnly={this.readOnly}
				theme={document.body.hasClass("theme-dark") ? "dark" : "light"}
				onChange={() => this.requestSave()}
				onReady={(e) => (this.engine = e)}
			/>,
		);
	}

	private unmount() {
		this.root?.unmount();
		this.root = null;
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

	private imageStore: ImageStore = {
		load: async (path) => {
			const file = this.app.vault.getFileByPath(path);
			if (!file) return null;
			const data = await this.app.vault.readBinary(file);
			return `data:${mimeOf(path)};base64,${arrayBufferToBase64(data)}`;
		},
		save: async (dataURL, mimeType) => {
			const name = `Pasted image ${window.moment().format("YYYYMMDDHHmmss")}.${extFromMime(mimeType)}`;
			const path = await this.app.fileManager.getAvailablePathForAttachment(name, this.file?.path);
			const file: TFile = await this.app.vault.createBinary(path, base64ToArrayBuffer(dataURL.split(",")[1]));
			return file.path;
		},
	};
}
