import type { ExcalidrawProps } from "@excalidraw/excalidraw/types";
import { codeSource, codeSrcdoc, isCodeLink } from "./code-cards";

/** Live HTML on the canvas. Scripts run, but without allow-same-origin they cannot reach the vault or Obsidian. */
function CodeCard({ source }: { source: string }) {
	// A new iframe per source: Chromium does not always reload when only srcdoc changes.
	return <iframe key={source} className="canvas-deck-code" sandbox="allow-scripts" srcDoc={codeSrcdoc(source)} title="Code card" />;
}

/** Embed props for code cards. The link icon on a card calls `edit`. */
export function codeCardProps(edit: (id: string) => void): Partial<ExcalidrawProps> {
	return {
		validateEmbeddable: (link) => (isCodeLink(link) ? true : undefined),
		renderEmbeddable: (el) => (isCodeLink(el.link) ? <CodeCard source={codeSource(el)} /> : null),
		onLinkOpen: (el, e) => {
			if (!isCodeLink(el.link)) return;
			e.preventDefault();
			edit(el.id);
		},
	};
}
