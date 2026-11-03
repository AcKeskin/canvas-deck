import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { BinaryFileData, BinaryFiles, DataURL } from "@excalidraw/excalidraw/types";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import type { MathDocument } from "mathjax-full/js/core/MathDocument.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import { AllPackages } from "mathjax-full/js/input/tex/AllPackages.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { mathjax } from "mathjax-full/js/mathjax.js";
import { SVG } from "mathjax-full/js/output/svg.js";

/** Equations are image elements with `customData.latex`. The SVG is made from it on load, never stored. */

/** Pixels per ex. 1 em = 2 ex = 48 px, readable on a 1920 px slide. */
const EX = 24;
const INK = "#1e1e1e";

export interface MathImage {
	id: string;
	dataURL: string;
	width: number;
	height: number;
}

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
let doc: MathDocument<unknown, unknown, unknown> | null = null;
const cache = new Map<string, MathImage>();

function mathDoc() {
	doc ??= mathjax.document("", {
		InputJax: new TeX({
			packages: AllPackages.filter((p) => p !== "bussproofs" && p !== "noundefined"),
			formatError: (_jax: unknown, err: Error) => {
				throw err;
			},
		}),
		OutputJax: new SVG({ fontCache: "none" }),
	});
	return doc;
}

export function mathLatex(el: ExcalidrawElement): string | null {
	const latex: unknown = el.customData?.latex;
	return el.type === "image" && typeof latex === "string" ? latex : null;
}

/** Renders display math to an SVG. Throws on bad LaTeX. */
export function renderMath(latex: string): MathImage {
	const hit = cache.get(latex);
	if (hit) return hit;
	const node = mathDoc().convert(latex, { display: true, em: 2 * EX, ex: EX, containerWidth: 1920 });
	let svg = adaptor.innerHTML(node as never);
	const w = exAttr(svg, "width");
	const h = exAttr(svg, "height");
	const width = Math.max(1, Math.round(w * EX));
	const height = Math.max(1, Math.round(h * EX));
	svg = svg
		.replace(/currentColor/g, INK)
		.replace(/width="[^"]*ex"/, `width="${width}"`)
		.replace(/height="[^"]*ex"/, `height="${height}"`)
		.replace(/style="[^"]*"/, "");
	const img: MathImage = { id: `math-${hash(latex)}`, dataURL: `data:image/svg+xml;base64,${base64(svg)}`, width, height };
	cache.set(latex, img);
	return img;
}

/** Excalidraw files for every equation in `elements`. Bad LaTeX is skipped. */
export function mathFiles(elements: readonly ExcalidrawElement[]): BinaryFiles {
	const files: BinaryFiles = {};
	for (const el of elements) {
		const latex = mathLatex(el);
		if (latex === null || el.type !== "image" || !el.fileId || files[el.fileId]) continue;
		try {
			files[el.fileId] = mathFile(el.fileId, renderMath(latex).dataURL);
		} catch {
			// Saved LaTeX that no longer parses shows as an empty image.
		}
	}
	return files;
}

export function mathFile(id: string, dataURL: string, created = 0): BinaryFileData {
	return { id: id as BinaryFileData["id"], dataURL: dataURL as DataURL, mimeType: "image/svg+xml", created };
}

function exAttr(svg: string, name: string): number {
	const m = svg.match(new RegExp(`${name}="([\\d.]+)ex"`));
	return m ? parseFloat(m[1]) : 1;
}

function base64(s: string): string {
	let bin = "";
	for (const b of new TextEncoder().encode(s)) bin += String.fromCharCode(b);
	return btoa(bin);
}

function hash(s: string): string {
	let h = 5381;
	for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
	return (h >>> 0).toString(36);
}
