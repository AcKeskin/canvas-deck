import type { ExcalidrawElementSkeleton } from "@excalidraw/excalidraw/data/transform";

/** Skeletons for a big mixed test slide: boxes, ellipses, labels, arrows and pen strokes in a grid. */
export function perfSlideSkeletons(count = 2000): ExcalidrawElementSkeleton[] {
	const out: ExcalidrawElementSkeleton[] = [];
	const cols = Math.ceil(Math.sqrt(count));
	for (let i = 0; i < count; i++) {
		const x = (i % cols) * 220;
		const y = Math.floor(i / cols) * 160;
		const roughness = i % 2;
		switch (i % 5) {
			case 0:
				out.push({ type: "rectangle", x, y, width: 160, height: 100, roughness });
				break;
			case 1:
				out.push({ type: "ellipse", x, y, width: 160, height: 100, roughness });
				break;
			case 2:
				out.push({ type: "text", x, y, text: `Node ${i}`, fontSize: 20 });
				break;
			case 3:
				out.push({ type: "arrow", x, y: y + 50, width: 180, height: 0, roughness });
				break;
			default:
				out.push({
					type: "freedraw",
					x,
					y,
					points: Array.from({ length: 30 }, (_, k) => [k * 5, Math.sin(k / 3) * 30] as [number, number]),
					roughness,
				} as unknown as ExcalidrawElementSkeleton);
		}
	}
	return out;
}
