import { convertToExcalidrawElements, exportToCanvas } from "@excalidraw/excalidraw";
import type { ExcalidrawFrameElement } from "@excalidraw/excalidraw/element/types";
import type { BinaryFiles, DataURL } from "@excalidraw/excalidraw/types";
import type { ImageStore } from "../canvas/engine";
import type { SlideData } from "../canvas/slide-data";
import { mimeOf } from "../canvas/vault-images";
import type { Deck } from "./deck-model";
import { pictureSize, planPages, wrapText, type PdfOptions, type PdfPage } from "./pdf-plan";
import { buildPdf, type PdfImagePage } from "./pdf-writer";

/** Draws every page of the deck and returns the PDF bytes. */
export async function renderDeckPdf(deck: Deck, images: ImageStore, opts: PdfOptions): Promise<Uint8Array> {
	const cache = new Map<string, string | null>();
	const pages: PdfImagePage[] = [];
	for (const page of planPages(deck, opts)) {
		const data = deck.slides[page.slide].data;
		pages.push(await renderPage(data, page, await loadFiles(data, images, cache)));
	}
	return buildPdf(pages);
}

async function renderPage(data: SlideData, page: PdfPage, files: BinaryFiles): Promise<PdfImagePage> {
	const b = page.bounds;
	const size = pictureSize(b);
	// An invisible frame pins the export to the page bounds. Excalidraw cuts off what lies outside it.
	const [rect] = convertToExcalidrawElements([{ type: "rectangle", x: b.x, y: b.y, width: b.width, height: b.height }]);
	const frame = { ...rect, type: "frame", name: null } as unknown as ExcalidrawFrameElement;
	const picture = await exportToCanvas({
		// Export with a frame drops elements of other frames; keep them.
		elements: data.elements.map((e) => (e.frameId ? { ...e, frameId: null } : e)),
		files,
		appState: { exportBackground: true, viewBackgroundColor: "#ffffff" },
		exportingFrame: frame,
		getDimensions: (w: number) => ({ width: size.width, height: size.height, scale: size.width / w }),
	});

	// Notes go under the picture, drawn into the same image.
	const fontSize = Math.round(size.width / 48);
	const font = `${fontSize}px sans-serif`;
	const lineHeight = Math.round(fontSize * 1.4);
	const canvas = document.createElement("canvas");
	const ctx = canvas.getContext("2d")!;
	ctx.font = font;
	const lines = page.notes ? wrapText(page.notes, size.width - 2 * fontSize, (s) => ctx.measureText(s).width) : [];
	canvas.width = size.width;
	canvas.height = size.height + (lines.length ? lines.length * lineHeight + 2 * fontSize : 0);
	ctx.fillStyle = "#ffffff";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.drawImage(picture, 0, 0);
	if (lines.length) {
		ctx.fillStyle = "#cccccc";
		ctx.fillRect(0, size.height, size.width, 2);
		ctx.fillStyle = "#333333";
		ctx.font = font;
		ctx.textBaseline = "top";
		lines.forEach((l, i) => ctx.fillText(l, fontSize, size.height + fontSize + i * lineHeight));
	}

	const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.9));
	if (!blob) throw new Error("Could not draw a page");
	return { jpeg: new Uint8Array(await blob.arrayBuffer()), width: canvas.width, height: canvas.height };
}

/** Image bytes for the slide's images. Missing files are skipped. */
async function loadFiles(data: SlideData, images: ImageStore, cache: Map<string, string | null>): Promise<BinaryFiles> {
	const files: BinaryFiles = {};
	for (const [id, path] of Object.entries(data.images)) {
		if (!cache.has(path)) cache.set(path, await images.load(path));
		const dataURL = cache.get(path);
		if (dataURL) files[id] = { id: id as any, dataURL: dataURL as DataURL, mimeType: mimeOf(path) as any, created: 0 };
	}
	return files;
}
