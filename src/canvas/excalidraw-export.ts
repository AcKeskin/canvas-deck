import * as excalidraw from "@excalidraw/excalidraw";
import type { ExcalidrawElement, ExcalidrawFrameLikeElement } from "@excalidraw/excalidraw/element/types";
import type { AppState, BinaryFileData, BinaryFiles, DataURL } from "@excalidraw/excalidraw/types";
import { mimeOf } from "./vault-images";

// Excalidraw's types point these at "@excalidraw/utils/export", which it doesn't ship, so they arrive untyped.

export interface ExportOptions {
	elements: readonly ExcalidrawElement[];
	files: BinaryFiles | null;
	appState?: Partial<AppState>;
	exportPadding?: number;
	maxWidthOrHeight?: number;
	exportingFrame?: ExcalidrawFrameLikeElement | null;
	getDimensions?: (width: number, height: number) => { width: number; height: number; scale?: number };
}

export const exportToCanvas = excalidraw.exportToCanvas as (opts: ExportOptions) => Promise<HTMLCanvasElement>;
export const exportToSvg = excalidraw.exportToSvg as (opts: ExportOptions) => Promise<SVGSVGElement>;

/** Excalidraw file entry for a vault image. */
export function imageFile(id: string, path: string, dataURL: string, created = 0): BinaryFileData {
	return { id: id as BinaryFileData["id"], dataURL: dataURL as DataURL, mimeType: mimeOf(path) as BinaryFileData["mimeType"], created };
}
