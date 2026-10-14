import type { Position } from "../present/stepper";
import type { Deck } from "./deck-model";

/**
 * Element links that point inside the deck:
 * `#cdeck:<slideId>` or `#cdeck:<slideId>/<viewId>`.
 */
const PREFIX = "#cdeck:";

export interface DeckLink {
	slideId: string;
	viewId?: string;
}

export interface LinkTarget {
	label: string;
	link: string;
}

export function deckLink(slideId: string, viewId?: string): string {
	return viewId ? `${PREFIX}${slideId}/${viewId}` : `${PREFIX}${slideId}`;
}

/** Null when the link is not a deck link. */
export function parseDeckLink(link: string | null | undefined): DeckLink | null {
	const text = link?.trim();
	if (!text?.startsWith(PREFIX)) return null;
	const [slideId, viewId, ...rest] = text.slice(PREFIX.length).split("/");
	if (!slideId || rest.length || viewId === "") return null;
	return viewId ? { slideId, viewId } : { slideId };
}

/** Where a link points in this deck (view -1 = start frame), or null if the slide or view is gone. */
export function resolveDeckLink(deck: Deck, slideId: string, viewId?: string): Position | null {
	const slide = deck.slides.findIndex((s) => s.id === slideId);
	if (slide < 0) return null;
	if (!viewId) return { slide, view: -1 };
	const view = deck.slides[slide].data.views.findIndex((v) => v.id === viewId);
	return view < 0 ? null : { slide, view };
}

/** Every slide and saved view as a link target, in deck order. */
export function linkTargets(deck: Deck): LinkTarget[] {
	return deck.slides.flatMap((s, i) => {
		const name = `Slide ${i + 1}: ${s.title || "Untitled"}`;
		return [
			{ label: name, link: deckLink(s.id) },
			...s.data.views.map((v) => ({ label: `${name} › ${v.name}`, link: deckLink(s.id, v.id) })),
		];
	});
}
