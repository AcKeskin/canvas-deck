import {
	CaptureUpdateAction,
	convertToExcalidrawElements,
	getCommonBounds,
	hashElementsVersion,
	newElementWith,
	restoreElements,
	viewportCoordsToSceneCoords,
} from "@excalidraw/excalidraw";
import type { ExcalidrawElement, FileId } from "@excalidraw/excalidraw/element/types";
import type { AppState, BinaryFiles, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { addView, CameraController, type CameraHost } from "./camera";
import { codeSource, CODE_LINK, isCodeLink } from "./code-cards";
import { imageFile } from "./excalidraw-export";
import { MotionSnapshot } from "./motion-snapshot";
import { formatNoteLink } from "./note-links";
import { allowWebEmbed } from "./web-embeds";
import { newId, type Bounds, type SlideData } from "./slide-data";
import { pruneImages, unsavedFileIds } from "./vault-images";

/** Where image bytes live. Obsidian vault in the app, a fake in tests. */
export interface ImageStore {
	load(path: string): Promise<string | null>;
	/** Saves a pasted/dropped image and returns its vault path. */
	save(dataURL: string, mimeType: string): Promise<string>;
}

/** Shows and opens vault notes for note embeds. Obsidian in the app, a fake in tests. */
export interface NoteRenderer {
	/** Draws the note into `el` and keeps it up to date. Returns a cleanup function. */
	render(path: string, el: HTMLElement): () => void;
	open(path: string): void;
}

/** Edits code card HTML. An Obsidian modal in the app, a fake in tests. */
export interface CodeEditor {
	/** Resolves the new source, or null if the user cancels. */
	edit(source: string): Promise<string | null>;
}

/** Public face of one slide canvas. Other modules talk to this, not to Excalidraw. */
export class CanvasEngine {
	readonly camera: CameraController;
	private _slide: SlideData;
	private sceneVersion = -1;
	private saving = new Set<string>();
	private motion: MotionSnapshot | null = null;
	private prepareTimer = 0;

	constructor(
		readonly api: ExcalidrawImperativeAPI,
		private store: ImageStore,
		slide: SlideData,
		private onChange: (slide: SlideData) => void,
		private code?: CodeEditor,
	) {
		this._slide = slide;
		this.camera = new CameraController(api as unknown as CameraHost);
	}

	/** Turns on smooth camera animation for big slides. `host` wraps the Excalidraw canvas. */
	enableMotion(host: HTMLElement, dark: () => boolean) {
		this.motion = new MotionSnapshot(this.api, host, dark);
		this.camera.motion = this.motion;
		this.schedulePrepare(300);
	}

	/** True once big-slide animation can use the pre-rendered picture. */
	get motionReady(): boolean {
		return this.motion?.ready ?? false;
	}

	/** Stops pending work. Call when the canvas unmounts. */
	dispose() {
		window.clearTimeout(this.prepareTimer);
		this.motion = null;
	}

	private schedulePrepare(delay: number) {
		if (!this.motion) return;
		window.clearTimeout(this.prepareTimer);
		this.prepareTimer = window.setTimeout(() => void this.motion?.prepare(), delay);
	}

	get slide(): SlideData {
		return this._slide;
	}

	/** Loads image bytes for every linked vault image. Missing files are skipped. */
	async loadImages() {
		const entries = Object.entries(this._slide.images);
		const loaded = await Promise.all(
			entries.map(async ([id, path]) => {
				const dataURL = await this.store.load(path);
				return dataURL ? imageFile(id, path, dataURL, Date.now()) : null;
			}),
		);
		this.api.addFiles(loaded.filter((f) => f !== null));
	}

	/** Wire to Excalidraw's onChange. */
	handleChange(elements: readonly ExcalidrawElement[], _appState: AppState, files: BinaryFiles) {
		const version = hashElementsVersion(elements);
		if (version === this.sceneVersion) return;
		this.sceneVersion = version;
		this.schedulePrepare(1500);
		this.update(pruneImages({ ...this._slide, elements: elements.filter((e) => !e.isDeleted) }));
		for (const id of unsavedFileIds(this._slide, Object.keys(files))) void this.saveFile(id, files);
	}

	private async saveFile(id: FileId, files: BinaryFiles) {
		const file = files[id];
		if (!file || this.saving.has(id) || !this._slide.elements.some((e) => e.type === "image" && e.fileId === id)) return;
		this.saving.add(id);
		try {
			const path = await this.store.save(file.dataURL, file.mimeType);
			this.update({ ...this._slide, images: { ...this._slide.images, [id]: path } });
		} finally {
			this.saving.delete(id);
		}
	}

	/** Puts a vault image on the canvas, centered at a scene point (default: view center). */
	async insertImage(path: string, at?: { x: number; y: number }) {
		const dataURL = await this.store.load(path);
		if (!dataURL) throw new Error(`Cannot read ${path}`);
		const { width, height } = await imageSize(dataURL);
		const id = newId() as FileId;
		this.api.addFiles([imageFile(id, path, dataURL, Date.now())]);
		const c = at ?? this.viewCenter();
		const [el] = convertToExcalidrawElements([
			{ type: "image", fileId: id, x: c.x - width / 2, y: c.y - height / 2, width, height },
		]);
		this._slide = { ...this._slide, images: { ...this._slide.images, [id]: path } };
		this.api.updateScene({ elements: [...this.api.getSceneElements(), el] });
	}

	/** Puts a live view of a vault note on the canvas, centered at a scene point (default: view center). */
	insertNote(path: string, at?: { x: number; y: number }) {
		this.insertEmbed(formatNoteLink(path), 600, 400, at);
	}

	/** Puts a live web page on the canvas. The link keeps the URL as typed; the iframe src comes from `webEmbedSrc`. */
	insertWebEmbed(url: string, at?: { x: number; y: number }) {
		const link = url.trim();
		allowWebEmbed(link);
		this.insertEmbed(link, 800, 450, at);
	}

	/** Puts a code card on the canvas, centered at a scene point (default: view center). */
	insertCodeCard(source: string, at?: { x: number; y: number }) {
		this.insertEmbed(CODE_LINK, 480, 320, at, { source });
	}

	private insertEmbed(link: string, width: number, height: number, at?: { x: number; y: number }, customData?: Record<string, unknown>) {
		const c = at ?? this.viewCenter();
		const [rect] = convertToExcalidrawElements([{ type: "rectangle", x: c.x - width / 2, y: c.y - height / 2, width, height }]);
		const el = { ...rect, type: "embeddable", link, roundness: null, ...(customData && { customData }) } as ExcalidrawElement;
		this.api.updateScene({ elements: [...this.api.getSceneElements(), el] });
	}

	/** Replaces a code card's HTML. Undoable. */
	setCodeSource(id: string, source: string) {
		const elements = this.api.getSceneElements().map((e) => (e.id === id ? newElementWith(e, { customData: { ...e.customData, source } }) : e));
		this.api.updateScene({ elements, captureUpdate: CaptureUpdateAction.IMMEDIATELY });
	}

	selectedCodeCard(): ExcalidrawElement | null {
		const ids = this.api.getAppState().selectedElementIds;
		return this.api.getSceneElements().find((e) => ids[e.id] && isCodeLink(e.link)) ?? null;
	}

	/** Opens the editor on a code card (default: the selected one) and saves the result. */
	async editCode(id?: string) {
		const el = id ? this.api.getSceneElements().find((e) => e.id === id) : this.selectedCodeCard();
		if (!el || !isCodeLink(el.link) || !this.code) return;
		const source = await this.code.edit(codeSource(el));
		if (source !== null) this.setCodeSource(el.id, source);
	}

	/** Re-measures text once fonts have loaded; text measured with a fallback font looks cut off. */
	refreshText() {
		const els = this.api.getSceneElements();
		const fresh = restoreElements(els, null, { refreshDimensions: true, repairBindings: true });
		const changed = fresh.some((e, i) => e.type === "text" && (Math.abs(e.width - els[i].width) > 0.5 || Math.abs(e.height - els[i].height) > 0.5));
		if (changed) this.api.updateScene({ elements: fresh, captureUpdate: CaptureUpdateAction.NEVER });
	}

	/** Adds elements on top. Missing fields get Excalidraw's defaults. They save like any edit. */
	addElements(elements: object[]) {
		const added = restoreElements(elements as Parameters<typeof restoreElements>[0], null);
		this.api.updateScene({ elements: [...this.api.getSceneElements(), ...added] });
	}

	/** Scene point under a screen point. */
	sceneAt(clientX: number, clientY: number) {
		return viewportCoordsToSceneCoords({ clientX, clientY }, this.api.getAppState());
	}

	hasSelection(): boolean {
		return Object.values(this.api.getAppState().selectedElementIds).some(Boolean);
	}

	/** Sets (or clears, with null) the link on every selected element. */
	linkSelection(link: string | null) {
		const ids = this.api.getAppState().selectedElementIds;
		const elements = this.api.getSceneElements().map((e) => (ids[e.id] ? newElementWith(e, { link }) : e));
		this.api.updateScene({ elements, captureUpdate: CaptureUpdateAction.IMMEDIATELY });
	}

	/** Link of the topmost linked element under a screen point, if any. */
	linkAt(clientX: number, clientY: number): string | null {
		const p = this.sceneAt(clientX, clientY);
		const elements = this.api.getSceneElements();
		for (let i = elements.length - 1; i >= 0; i--) {
			const e = elements[i];
			if (!e.link) continue;
			const [x1, y1, x2, y2] = getCommonBounds([e]);
			if (p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2) return e.link;
		}
		return null;
	}

	saveCurrentView(name: string) {
		this.update(addView(this._slide, { id: newId(), name, bounds: this.camera.currentBounds() }));
	}

	setViews(views: SlideData["views"]) {
		this.update({ ...this._slide, views });
	}

	setFrame(frame: Bounds) {
		this.update({ ...this._slide, frame });
	}

	private viewCenter() {
		const b = this.camera.currentBounds();
		return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
	}

	private update(slide: SlideData) {
		this._slide = slide;
		this.onChange(slide);
	}
}

function imageSize(dataURL: string): Promise<{ width: number; height: number }> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve({ width: img.naturalWidth || 400, height: img.naturalHeight || 300 });
		img.onerror = reject;
		img.src = dataURL;
	});
}
