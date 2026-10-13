import type { Bounds, SavedView, SlideData } from "./slide-data";

/** Excalidraw camera: screen = (scene + scroll) * zoom. */
export interface Camera {
	scrollX: number;
	scrollY: number;
	zoom: number;
}

export interface Viewport {
	width: number;
	height: number;
}

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 30;

/** Smallest subset of the Excalidraw API the camera needs. */
export interface CameraHost {
	getAppState(): { scrollX: number; scrollY: number; zoom: { value: number }; width: number; height: number };
	updateScene(scene: { appState: Record<string, unknown> }): void;
}

export interface Clock {
	now(): number;
	frame(cb: () => void): void;
}

const browserClock: Clock = {
	now: () => performance.now(),
	frame: (cb) => requestAnimationFrame(() => cb()),
};

const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

/** Camera that fits the bounds in the viewport, centered. */
export function cameraForBounds(b: Bounds, vp: Viewport): Camera {
	const zoom = clampZoom(Math.min(vp.width / b.width, vp.height / b.height));
	return fromCenter(b.x + b.width / 2, b.y + b.height / 2, zoom, vp);
}

/** Scene area visible with this camera. */
export function visibleBounds(cam: Camera, vp: Viewport): Bounds {
	return { x: -cam.scrollX, y: -cam.scrollY, width: vp.width / cam.zoom, height: vp.height / cam.zoom };
}

function fromCenter(cx: number, cy: number, zoom: number, vp: Viewport): Camera {
	return { scrollX: vp.width / (2 * zoom) - cx, scrollY: vp.height / (2 * zoom) - cy, zoom };
}

function centerOf(cam: Camera, vp: Viewport) {
	return { cx: vp.width / (2 * cam.zoom) - cam.scrollX, cy: vp.height / (2 * cam.zoom) - cam.scrollY };
}

/** Center moves linearly, zoom moves in log space so it feels even. */
export function lerpCamera(a: Camera, b: Camera, t: number, vp: Viewport): Camera {
	if (t >= 1) return b;
	const ca = centerOf(a, vp);
	const cb = centerOf(b, vp);
	const zoom = Math.exp(Math.log(a.zoom) + (Math.log(b.zoom) - Math.log(a.zoom)) * t);
	return fromCenter(ca.cx + (cb.cx - ca.cx) * t, ca.cy + (cb.cy - ca.cy) * t, zoom, vp);
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export class CameraController {
	private token = 0;

	constructor(
		private host: CameraHost,
		private clock: Clock = browserClock,
	) {}

	get camera(): Camera {
		const s = this.host.getAppState();
		return { scrollX: s.scrollX, scrollY: s.scrollY, zoom: s.zoom.value };
	}

	get viewport(): Viewport {
		const s = this.host.getAppState();
		return { width: s.width, height: s.height };
	}

	set(cam: Camera) {
		this.host.updateScene({ appState: { scrollX: cam.scrollX, scrollY: cam.scrollY, zoom: { value: cam.zoom } } });
	}

	/** Moves to the bounds. Resolves when done; a newer move cancels this one. */
	goToBounds(b: Bounds, opts: { animate?: boolean; duration?: number } = {}): Promise<void> {
		const { animate = true, duration = 600 } = opts;
		const token = ++this.token;
		const vp = this.viewport;
		const from = this.camera;
		const to = cameraForBounds(b, vp);
		// Excalidraw applies scene updates async, so resolve one frame after the last set.
		const settle = (resolve: () => void) => this.clock.frame(resolve);
		if (!animate || duration <= 0) {
			this.set(to);
			return new Promise(settle);
		}
		const start = this.clock.now();
		return new Promise((resolve) => {
			const step = () => {
				if (token !== this.token) return resolve();
				const t = Math.min(1, (this.clock.now() - start) / duration);
				this.set(lerpCamera(from, to, easeInOut(t), vp));
				if (t >= 1) settle(resolve);
				else this.clock.frame(step);
			};
			this.clock.frame(step);
		});
	}

	goToFrame(slide: SlideData, opts?: { animate?: boolean; duration?: number }) {
		return this.goToBounds(slide.frame, opts);
	}

	goToView(slide: SlideData, id: string, opts?: { animate?: boolean; duration?: number }) {
		const view = slide.views.find((v) => v.id === id);
		if (!view) return Promise.reject(new Error(`No view ${id}`));
		return this.goToBounds(view.bounds, opts);
	}

	/** Current visible area, for saving as a view. */
	currentBounds(): Bounds {
		return visibleBounds(this.camera, this.viewport);
	}

	setReadOnly(readOnly: boolean) {
		this.host.updateScene({ appState: { viewModeEnabled: readOnly } });
	}
}

export function addView(slide: SlideData, view: SavedView): SlideData {
	return { ...slide, views: [...slide.views, view] };
}

export function removeView(slide: SlideData, id: string): SlideData {
	return { ...slide, views: slide.views.filter((v) => v.id !== id) };
}

export function renameView(slide: SlideData, id: string, name: string): SlideData {
	return { ...slide, views: slide.views.map((v) => (v.id === id ? { ...v, name } : v)) };
}

export function moveView(slide: SlideData, from: number, to: number): SlideData {
	const views = [...slide.views];
	const [v] = views.splice(from, 1);
	if (!v) return slide;
	views.splice(Math.max(0, Math.min(to, views.length)), 0, v);
	return { ...slide, views };
}
