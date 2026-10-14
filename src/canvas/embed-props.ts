import type { ExcalidrawProps } from "@excalidraw/excalidraw/types";

/** Joins the embed props of each embed kind. The first kind that accepts or renders a link wins. */
export function combineEmbedProps(...kinds: Partial<ExcalidrawProps>[]): Partial<ExcalidrawProps> {
	return {
		validateEmbeddable: (link) => (kinds.some((k) => typeof k.validateEmbeddable === "function" && k.validateEmbeddable(link)) ? true : undefined),
		renderEmbeddable: (el, state) => {
			for (const k of kinds) {
				const node = k.renderEmbeddable?.(el, state);
				if (node) return node;
			}
			return null;
		},
		onLinkOpen: (el, e) => kinds.forEach((k) => k.onLinkOpen?.(el, e)),
	};
}
