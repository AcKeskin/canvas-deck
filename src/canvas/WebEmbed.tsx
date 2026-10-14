import type { ExcalidrawProps } from "@excalidraw/excalidraw/types";
import { isLiveWebLink, isWebLink, WEB_SANDBOX, webEmbedSrc } from "./web-embeds";

/**
 * A live web page. Our own iframe, not Excalidraw's: Excalidraw's turns off scrolling,
 * runs most sites without their own origin, and rewrites links unlike `webEmbedSrc`.
 */
function WebEmbed({ url }: { url: string }) {
	return (
		<iframe
			className="excalidraw__embeddable canvas-deck-web"
			src={webEmbedSrc(url)}
			title={url}
			allow="autoplay; fullscreen; picture-in-picture; encrypted-media; clipboard-write"
			allowFullScreen
			sandbox={WEB_SANDBOX}
		/>
	);
}

/** Excalidraw props that show embeddables with http(s) links as live web pages. */
export const webEmbedProps: Partial<ExcalidrawProps> = {
	validateEmbeddable: (link) => (isLiveWebLink(link) ? true : undefined),
	renderEmbeddable: (el) => (isWebLink(el.link) ? <WebEmbed url={el.link} /> : null),
};
