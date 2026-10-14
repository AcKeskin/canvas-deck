import "@excalidraw/excalidraw/index.css";
import "../../src/deck/deck.css";
import { convertToExcalidrawElements, getFreeDrawSvgPath } from "@excalidraw/excalidraw";
import { createRoot } from "react-dom/client";
import type { CanvasEngine, ImageStore } from "../../src/canvas/engine";
import { SlideCanvas } from "../../src/canvas/SlideCanvas";
import { createSlide, type SlideData } from "../../src/canvas/slide-data";
import { perfSlideSkeletons } from "../../src/dev/perf-slide";
import { demoDeck } from "../../src/dev/demo-deck";
import { DeckEditor, type DeckHandle } from "../../src/deck/DeckEditor";
import { parseDeck, serializeDeck } from "../../src/deck/deck-format";
import type { Deck } from "../../src/deck/deck-model";
import type { PdfOptions } from "../../src/deck/pdf-plan";
import { renderDeckPdf } from "../../src/deck/pdf-render";

// Fonts come from /fonts here, not the CDN (see vite.config.ts).
window.EXCALIDRAW_ASSET_PATH = "/";

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
			deck?: Deck;
			handle?: DeckHandle;
			serialize: typeof serializeDeck;
			parse: typeof parseDeck;
			/** PDF of the current deck, base64. */
			pdf(opts: PdfOptions): Promise<string>;
		};
	}
}
window.harness = {
	engine: null,
	files,
	saves: 0,
	freeDrawPath: getFreeDrawSvgPath,
	serialize: serializeDeck,
	parse: parseDeck,
	pdf: async (opts) => {
		const bytes = await renderDeckPdf(window.harness.deck!, store, opts);
		let s = "";
		for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
		return btoa(s);
	},
};

const root = createRoot(document.getElementById("root")!);
if (params.has("deck")) {
	// Full deck editor with the demo deck.
	// ?deck=stored loads the deck a test put in sessionStorage.
	const saved = params.get("deck") === "stored" ? sessionStorage.getItem("deck") : null;
	const deck = saved ? parseDeck(saved) : demoDeck();
	window.harness.deck = deck;
	root.render(
		<DeckEditor
			initial={deck}
			images={store}
			onChange={(d) => {
				window.harness.deck = d;
				window.harness.saves++;
			}}
			onReady={(h) => (window.harness.handle = h)}
			onEngine={(e) => (window.harness.engine = e)}
		/>,
	);
} else {
	root.render(
		<SlideCanvas
			initial={initial}
			images={store}
			onChange={() => window.harness.saves++}
			onReady={(e) => (window.harness.engine = e)}
		/>,
	);
}
