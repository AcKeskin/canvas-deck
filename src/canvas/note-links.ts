import type { SlideData } from "./slide-data";

/** Note embeds keep the vault path in the element link: `obsidian-note:<vault path>`. */
export const NOTE_SCHEME = "obsidian-note:";

export function formatNoteLink(path: string): string {
	return NOTE_SCHEME + path;
}

/** Vault path from a note link, or null if it isn't one. */
export function parseNoteLink(link: string | null | undefined): string | null {
	if (!link?.startsWith(NOTE_SCHEME)) return null;
	const path = link.slice(NOTE_SCHEME.length).trim();
	return path || null;
}

export function isNotePath(path: string): boolean {
	return path.toLowerCase().endsWith(".md");
}

/** Updates note links after a vault rename. Returns the same slide if nothing changed. */
export function renameNote(slide: SlideData, oldPath: string, newPath: string): SlideData {
	let changed = false;
	const elements = slide.elements.map((e) => {
		if (e.type !== "embeddable" || parseNoteLink(e.link) !== oldPath) return e;
		changed = true;
		return { ...e, link: formatNoteLink(newPath) };
	});
	return changed ? { ...slide, elements } : slide;
}
