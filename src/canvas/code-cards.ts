import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";

/** Code cards are embeddables with this exact link. The HTML lives in `customData.source`. */
export const CODE_LINK = "canvas-deck-code:";

export const STARTER_CODE = `<button>Clicked 0 times</button>
<script>
	const b = document.querySelector("button");
	let n = 0;
	b.onclick = () => (b.textContent = \`Clicked \${++n} times\`);
</script>`;

export function isCodeLink(link: string | null | undefined): boolean {
	return link === CODE_LINK;
}

/** The card's HTML, or "" if it has none. */
export function codeSource(el: ExcalidrawElement): string {
	const source = el.customData?.source;
	return typeof source === "string" ? source : "";
}

/** Page for the card's iframe. The default style goes first so the source can override it. */
export function codeSrcdoc(source: string): string {
	return `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;height:100%}body{box-sizing:border-box;padding:16px;font:18px system-ui,sans-serif;background:#fff;color:#222}</style>\n${source}`;
}
