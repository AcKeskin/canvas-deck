import { convertToExcalidrawElements } from "@excalidraw/excalidraw";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { BinaryFiles } from "@excalidraw/excalidraw/types";
import { useEffect, useRef } from "react";
import type { ImageStore } from "../canvas/engine";
import type { SlideData } from "../canvas/slide-data";
import { exportToSvg, imageFile } from "../canvas/excalidraw-export";

/** Small preview of the slide's start frame, redrawn shortly after its content changes. */
export function Thumb({ data, images }: { data: SlideData; images: ImageStore }) {
	const ref = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const draw = async () => {
			const el = ref.current;
			if (!el) return;
			const f = data.frame;
			// An invisible rectangle pins the export to the start frame.
			const [pin] = convertToExcalidrawElements([
				{ type: "rectangle", x: f.x, y: f.y, width: f.width, height: f.height, opacity: 0, strokeColor: "transparent" },
			]);
			const inFrame = data.elements.filter(
				(e) => e.x < f.x + f.width && e.x + e.width > f.x && e.y < f.y + f.height && e.y + e.height > f.y,
			);
			try {
				const svg = await exportToSvg({
					elements: [pin, ...inFrame],
					files: await loadFiles(inFrame, data, images),
					appState: { exportBackground: false },
					exportPadding: 0,
				});
				svg.setAttribute("width", "100%");
				svg.setAttribute("height", "100%");
				el.replaceChildren(svg);
			} catch {
				el.replaceChildren();
			}
		};
		const t = window.setTimeout(() => void draw(), 600);
		return () => window.clearTimeout(t);
	}, [data, images]);
	return <div className="canvas-deck-thumb" ref={ref} />;
}

/** Image bytes for the image elements in `elements`. Missing files are skipped. */
async function loadFiles(elements: readonly ExcalidrawElement[], data: SlideData, images: ImageStore): Promise<BinaryFiles> {
	const files: BinaryFiles = {};
	for (const e of elements) {
		if (e.type !== "image" || !e.fileId || files[e.fileId]) continue;
		const path = data.images[e.fileId];
		const dataURL = path ? await images.load(path) : null;
		if (dataURL) files[e.fileId] = imageFile(e.fileId, path, dataURL);
	}
	return files;
}
