import type { FileId } from "@excalidraw/excalidraw/element/types";
import type { SlideData } from "./slide-data";

export const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"];

const MIME: Record<string, string> = {
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	gif: "image/gif",
	webp: "image/webp",
	svg: "image/svg+xml",
	bmp: "image/bmp",
};

export function isImagePath(path: string): boolean {
	return IMAGE_EXTENSIONS.includes(extOf(path));
}

export function mimeOf(path: string): string {
	return MIME[extOf(path)] ?? "application/octet-stream";
}

export function extFromMime(mime: string): string {
	return Object.keys(MIME).find((k) => MIME[k] === mime) ?? "png";
}

function extOf(path: string): string {
	return path.split(".").pop()?.toLowerCase() ?? "";
}

/** File ids on the canvas that have no vault path yet (pasted or dropped from outside). */
export function unsavedFileIds(slide: SlideData, fileIds: Iterable<string>): FileId[] {
	return [...fileIds].filter((id) => !(id in slide.images)) as FileId[];
}

/** File ids still used by an image element. */
export function usedFileIds(slide: SlideData): Set<string> {
	const ids = new Set<string>();
	for (const el of slide.elements) {
		if (el.type === "image" && !el.isDeleted && el.fileId) ids.add(el.fileId);
	}
	return ids;
}

/** Drops vault links for images no longer on the canvas. The vault file stays. */
export function pruneImages(slide: SlideData): SlideData {
	const used = usedFileIds(slide);
	const images = Object.fromEntries(Object.entries(slide.images).filter(([id]) => used.has(id)));
	return { ...slide, images };
}

/** Updates links after a vault rename. Returns the same slide if nothing changed. */
export function renameImage(slide: SlideData, oldPath: string, newPath: string): SlideData {
	let changed = false;
	const images = Object.fromEntries(
		Object.entries(slide.images).map(([id, p]) => {
			if (p !== oldPath) return [id, p];
			changed = true;
			return [id, newPath];
		}),
	);
	return changed ? { ...slide, images } : slide;
}

/** Vault path from text Obsidian puts on a drag (obsidian:// URI or a [[link]]). */
export function pathFromDragText(text: string): string | null {
	const t = text.trim().split("\n")[0];
	if (t.startsWith("obsidian://")) {
		const file = new URL(t).searchParams.get("file");
		return file || null;
	}
	const m = t.match(/^!?\[\[([^\]|#]+)/);
	return m ? m[1] : null;
}
