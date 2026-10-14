import type { ExcalidrawElement, FileId } from "@excalidraw/excalidraw/element/types";

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
	/** Speaker notes for this step. */
	notes?: string;
}

export interface SlideData {
	version: 1;
	/** Start frame: what the audience sees first. 16:9 by default. */
	frame: Bounds;
	/** Ordered camera targets to step through. */
	views: SavedView[];
	elements: readonly ExcalidrawElement[];
	/** Image file id -> vault path. Image bytes stay in the vault. */
	images: Record<FileId, string>;
}

export const FRAME_WIDTH = 1920;
export const FRAME_HEIGHT = 1080;

export function createSlide(): SlideData {
	return {
		version: 1,
		frame: { x: 0, y: 0, width: FRAME_WIDTH, height: FRAME_HEIGHT },
		views: [],
		elements: [],
		images: {},
	};
}

export function newId(): string {
	return Math.random().toString(36).slice(2, 12);
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
		views: Array.isArray(raw.views) ? raw.views.filter((v) => v && isBounds(v.bounds)).map(cleanView) : [],
		elements: Array.isArray(raw.elements) ? repairElements(raw.elements) : [],
		images: raw.images && typeof raw.images === "object" ? raw.images : {},
	};
}

function cleanView(v: SavedView): SavedView {
	if (v.notes === undefined || typeof v.notes === "string") return v;
	const { notes: _, ...rest } = v;
	return rest;
}

function isBounds(b: unknown): b is Bounds {
	if (!b || typeof b !== "object") return false;
	const o = b as Record<string, unknown>;
	return ["x", "y", "width", "height"].every((k) => typeof o[k] === "number" && Number.isFinite(o[k]));
}

/** Fills fields Excalidraw needs to draw. Freedraw without `pressures` crashes its renderer. */
export function repairElements(els: readonly ExcalidrawElement[]): ExcalidrawElement[] {
	return els.map((e) =>
		e.type === "freedraw" && !Array.isArray((e as any).pressures) ? ({ ...e, pressures: [], simulatePressure: true } as ExcalidrawElement) : e,
	);
}
