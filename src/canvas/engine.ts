import { convertToExcalidrawElements, getSceneVersion, viewportCoordsToSceneCoords } from "@excalidraw/excalidraw";
import type { ExcalidrawElement, FileId } from "@excalidraw/excalidraw/element/types";
import type { AppState, BinaryFiles, DataURL, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { addView, CameraController, type CameraHost } from "./camera";
import type { SlideData } from "./slide-data";
import { mimeOf, pruneImages, renameImage, unsavedFileIds } from "./vault-images";

/** Where image bytes live. Obsidian vault in the app, a fake in tests. */
export interface ImageStore {
	load(path: string): Promise<string | null>;
	/** Saves a pasted/dropped image and returns its vault path. */
	save(dataURL: string, mimeType: string): Promise<string>;
}

/** Public face of one slide canvas. Other modules talk to this, not to Excalidraw. */
export class CanvasEngine {
	readonly camera: CameraController;
	private _slide: SlideData;
	private sceneVersion = -1;
	private saving = new Set<string>();

	constructor(
		readonly api: ExcalidrawImperativeAPI,
		private store: ImageStore,
		slide: SlideData,
		private onChange: (slide: SlideData) => void,
	) {
		this._slide = slide;
		this.camera = new CameraController(api as unknown as CameraHost);
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
				return dataURL ? { id: id as FileId, dataURL: dataURL as DataURL, mimeType: mimeOf(path) as any, created: Date.now() } : null;
			}),
		);
		this.api.addFiles(loaded.filter((f) => f !== null));
	}

	/** Wire to Excalidraw's onChange. */
	handleChange(elements: readonly ExcalidrawElement[], _appState: AppState, files: BinaryFiles) {
		const version = getSceneVersion(elements);
		if (version === this.sceneVersion) return;
		this.sceneVersion = version;
		this.update(pruneImages({ ...this._slide, elements: elements.filter((e) => !e.isDeleted) }));
		for (const id of unsavedFileIds(this._slide, Object.keys(files))) this.saveFile(id, files);
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
		const id = randomId() as FileId;
		this.api.addFiles([{ id, dataURL: dataURL as DataURL, mimeType: mimeOf(path) as any, created: Date.now() }]);
		const c = at ?? this.viewCenter();
		const [el] = convertToExcalidrawElements([
			{ type: "image", fileId: id, x: c.x - width / 2, y: c.y - height / 2, width, height },
		]);
		this._slide = { ...this._slide, images: { ...this._slide.images, [id]: path } };
		this.api.updateScene({ elements: [...this.api.getSceneElements(), el] });
	}

	/** Scene point under a screen point. */
	sceneAt(clientX: number, clientY: number) {
		return viewportCoordsToSceneCoords({ clientX, clientY }, this.api.getAppState());
	}

	renameImage(oldPath: string, newPath: string) {
		const next = renameImage(this._slide, oldPath, newPath);
		if (next !== this._slide) this.update(next);
	}

	saveCurrentView(name: string) {
		this.update(addView(this._slide, { id: randomId(), name, bounds: this.camera.currentBounds() }));
	}

	setViews(views: SlideData["views"]) {
		this.update({ ...this._slide, views });
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

function randomId(): string {
	return Math.random().toString(36).slice(2, 12);
}
