import { exportToCanvas, getCommonBounds, getSceneVersion } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { Camera, Motion } from "./camera";

/** Below this many objects Excalidraw animates fine on its own. */
const MIN_ELEMENTS = 300;
const MAX_SIDE = 2048;

/**
 * Big slides: during a camera animation, show one pre-rendered picture of the scene
 * moved with a CSS transform, instead of redrawing every object each frame.
 */
export class MotionSnapshot implements Motion {
	private snap: { canvas: HTMLCanvasElement; x: number; y: number; scale: number } | null = null;
	private version = -1;
	private active = false;

	constructor(
		private api: ExcalidrawImperativeAPI,
		private host: HTMLElement,
		private dark: () => boolean,
	) {}

	get ready(): boolean {
		return this.snap !== null;
	}

	/** Renders the picture if the scene changed since the last one. */
	async prepare() {
		const elements = this.api.getSceneElements();
		const version = getSceneVersion(elements);
		if (version === this.version) return;
		this.version = version;
		if (elements.length < MIN_ELEMENTS) {
			this.snap = null;
			return;
		}
		const [minX, minY, maxX] = getCommonBounds(elements);
		const canvas = await exportToCanvas({
			elements,
			files: this.api.getFiles(),
			appState: { exportBackground: false, exportWithDarkMode: this.dark() },
			maxWidthOrHeight: MAX_SIDE,
			exportPadding: 0,
		});
		canvas.className = "canvas-deck-motion";
		this.snap = { canvas, x: minX, y: minY, scale: canvas.width / (maxX - minX) };
	}

	begin(): boolean {
		if (!this.snap || this.active) return !!this.snap;
		this.active = true;
		this.host.appendChild(this.snap.canvas);
		this.host.classList.add("is-moving");
		return true;
	}

	frame(cam: Camera) {
		if (!this.snap) return;
		const { canvas, x, y, scale } = this.snap;
		const tx = (x + cam.scrollX) * cam.zoom;
		const ty = (y + cam.scrollY) * cam.zoom;
		canvas.style.transform = `translate(${tx}px, ${ty}px) scale(${cam.zoom / scale})`;
	}

	end() {
		if (!this.active) return;
		this.active = false;
		this.snap?.canvas.remove();
		this.host.classList.remove("is-moving");
	}
}
