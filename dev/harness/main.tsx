import "@excalidraw/excalidraw/index.css";
import { convertToExcalidrawElements, getFreeDrawSvgPath } from "@excalidraw/excalidraw";
import { createRoot } from "react-dom/client";
import type { CanvasEngine, ImageStore } from "../../src/canvas/engine";
import { SlideCanvas } from "../../src/canvas/SlideCanvas";
import { createSlide, type SlideData } from "../../src/canvas/slide-data";
import { perfSlideSkeletons } from "../../src/dev/perf-slide";

// 2x1 red PNG.
const DOT =
	"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEElEQVR4nGP4z8DwnwGIAQwvAf/CaHzrAAAAAElFTkSuQmCC";

/** In-memory stand-in for the vault. */
const files = new Map<string, string>([["pics/dot.png", DOT]]);
const store: ImageStore = {
	load: async (p) => files.get(p) ?? null,
	save: async (dataURL) => {
		const p = `attachments/pasted-${files.size}.png`;
		files.set(p, dataURL);
		return p;
	},
};

const params = new URLSearchParams(location.search);
const perf = Number(params.get("perf") ?? 0);
const initial: SlideData = {
	...createSlide(),
	elements: perf ? convertToExcalidrawElements(perfSlideSkeletons(perf)) : [],
};

declare global {
	interface Window {
		harness: {
			engine: CanvasEngine | null;
			files: Map<string, string>;
			saves: number;
			freeDrawPath: typeof getFreeDrawSvgPath;
		};
	}
}
window.harness = { engine: null, files, saves: 0, freeDrawPath: getFreeDrawSvgPath };

createRoot(document.getElementById("root")!).render(
	<SlideCanvas
		initial={initial}
		images={store}
		onChange={() => window.harness.saves++}
		onReady={(e) => (window.harness.engine = e)}
	/>,
);
