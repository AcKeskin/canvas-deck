import type { ExcalidrawProps } from "@excalidraw/excalidraw/types";
import { isWebLink, webEmbedSrc } from "./web-embeds";

/**
 * A live web page. Our own iframe, not Excalidraw's: Excalidraw's turns off scrolling,
 * runs most sites without their own origin, and rewrites links unlike `webEmbedSrc`.
 * No top navigation in the sandbox, so a page can't take over Obsidian.
 */
function WebEmbed({ url }: { url: string }) {
	return (
		<iframe
			className="excalidraw__embeddable canvas-deck-web"
			src={webEmbedSrc(url)}
			title={url}
			allow="autoplay; fullscreen; picture-in-picture; encrypted-media; clipboard-write"
			allowFullScreen
			sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
		/>
	);
}

/** Excalidraw props that show embeddables with http(s) links as live web pages. */
export const webEmbedProps: Partial<ExcalidrawProps> = {
	validateEmbeddable: (link) => (isWebLink(link) ? true : undefined),
	renderEmbeddable: (el) => (isWebLink(el.link) ? <WebEmbed url={el.link} /> : null),
};
