import type { ExcalidrawProps } from "@excalidraw/excalidraw/types";
import { codeSource, codeSrcdoc, isCodeLink } from "./code-cards";

/** Live HTML on the canvas. Scripts run, but without allow-same-origin they cannot reach the vault or Obsidian. */
function CodeCard({ source }: { source: string }) {
	// A new iframe per source: Chromium does not always reload when only srcdoc changes.
	return <iframe key={source} className="canvas-deck-code" sandbox="allow-scripts" srcDoc={codeSrcdoc(source)} title="Code card" />;
}

/** Adds code cards to `base` embed props. The link icon on a card calls `edit`; other embeds go to `base`. */
export function withCodeCards(base: Partial<ExcalidrawProps>, edit: (id: string) => void): Partial<ExcalidrawProps> {
	const validate = base.validateEmbeddable;
	return {
		...base,
		validateEmbeddable: (link) => (isCodeLink(link) ? true : typeof validate === "function" ? validate(link) : undefined),
		renderEmbeddable: (el, appState) => (isCodeLink(el.link) ? <CodeCard source={codeSource(el)} /> : (base.renderEmbeddable?.(el, appState) ?? null)),
		onLinkOpen: (el, e) => {
			if (!isCodeLink(el.link)) return base.onLinkOpen?.(el, e);
			e.preventDefault();
			edit(el.id);
		},
	};
}
