import type { ExcalidrawElement, FileId } from "@excalidraw/excalidraw/element/types";

export type Style = "sketch" | "clean";

export interface Bounds {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface SavedView {
	id: string;
	name: string;
	bounds: Bounds;
}

export interface SlideData {
	version: 1;
	/** 16:9 start frame: what the audience sees first. */
	frame: Bounds;
	/** Ordered camera targets to step through. */
	views: SavedView[];
	elements: readonly ExcalidrawElement[];
	/** Image file id -> vault path. Image bytes stay in the vault. */
	images: Record<FileId, string>;
}

export const FRAME_WIDTH = 1920;
export const FRAME_HEIGHT = 1080;

const ROUGHNESS: Record<Style, number> = { sketch: 1, clean: 0 };

export function createSlide(): SlideData {
	return {
		version: 1,
		frame: { x: 0, y: 0, width: FRAME_WIDTH, height: FRAME_HEIGHT },
		views: [],
		elements: [],
		images: {},
	};
}

export function styleOf(el: ExcalidrawElement): Style {
	return el.roughness === 0 ? "clean" : "sketch";
}

export function roughnessFor(style: Style): number {
	return ROUGHNESS[style];
}

export function serializeSlide(slide: SlideData): string {
	return JSON.stringify(slide);
}

export function deserializeSlide(text: string): SlideData {
	const raw = JSON.parse(text) as Partial<SlideData>;
	if (raw.version !== 1) throw new Error(`Unsupported slide version: ${raw.version}`);
	const base = createSlide();
	return {
		version: 1,
		frame: isBounds(raw.frame) ? raw.frame : base.frame,
		views: Array.isArray(raw.views) ? raw.views.filter((v) => v && isBounds(v.bounds)) : [],
		elements: Array.isArray(raw.elements) ? raw.elements : [],
		images: raw.images && typeof raw.images === "object" ? raw.images : {},
	};
}

function isBounds(b: unknown): b is Bounds {
	if (!b || typeof b !== "object") return false;
	const o = b as Record<string, unknown>;
	return ["x", "y", "width", "height"].every((k) => typeof o[k] === "number" && Number.isFinite(o[k]));
}
