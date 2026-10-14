import { convertToExcalidrawElements } from "@excalidraw/excalidraw";
import type { ExcalidrawElementSkeleton } from "@excalidraw/excalidraw/data/transform";
import { createSlide, newId, type SlideData } from "../canvas/slide-data";
import type { Deck } from "../deck/deck-model";
import { perfSlideSkeletons } from "./perf-slide";

const text = (x: number, y: number, t: string, fontSize: number): ExcalidrawElementSkeleton => ({ type: "text", x, y, text: t, fontSize });

const box = (x: number, y: number, label: string, roughness = 1): ExcalidrawElementSkeleton => ({
	type: "rectangle",
	x,
	y,
	width: 280,
	height: 120,
	roughness,
	backgroundColor: "#a5d8ff",
	fillStyle: "hachure",
	label: { text: label, fontSize: 28 },
});

const slide = (skeletons: ExcalidrawElementSkeleton[], views: SlideData["views"] = []): SlideData => ({
	...createSlide(),
	elements: convertToExcalidrawElements(skeletons),
	views,
});

/** Three-slide sample: title, a flow, and a 2,000-object diagram with saved views to step through. */
export function demoDeck(): Deck {
	const flow = [box(160, 420, "Idea"), box(820, 420, "Sketch", 0), box(1480, 420, "Present")];
	const arrows: ExcalidrawElementSkeleton[] = [
		{ type: "arrow", x: 450, y: 480, width: 360, height: 0 },
		{ type: "arrow", x: 1110, y: 480, width: 360, height: 0 },
	];
	return {
		frontmatter: [],
		slides: [
			{
				id: newId(),
				title: "Canvas Deck",
				notes: "Every slide is an infinite canvas. Arrows step, drag and scroll move freely.",
				data: slide([text(560, 380, "Canvas Deck", 120), text(600, 560, "slides that are infinite canvases", 48)]),
			},
			{
				id: newId(),
				title: "How it works",
				notes: "Left box is sketch style, middle is clean style. Press N to hide these notes.",
				data: slide([...flow, ...arrows, text(160, 160, "How it works", 72)]),
			},
			{
				id: newId(),
				title: "A big diagram",
				notes: "2,000 objects. Press → to fly through the saved views, or explore freely.",
				data: {
					...slide(
						[text(0, -700, "A big diagram (2,000 objects)", 360), ...perfSlideSkeletons(2000)],
						[
							{ id: newId(), name: "Top left", bounds: { x: -40, y: -40, width: 1600, height: 900 } },
							{ id: newId(), name: "Middle", bounds: { x: 4000, y: 3000, width: 1600, height: 900 } },
							{ id: newId(), name: "Bottom right", bounds: { x: 8200, y: 6200, width: 1600, height: 900 } },
						],
					),
					// Start on the whole diagram, then zoom in through the views.
					frame: { x: -2520, y: -1000, width: 14940, height: 8404 },
				},
			},
		],
	};
}
