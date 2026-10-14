/** One pen stroke in scene coordinates. */
export interface Stroke {
	points: [number, number][];
	/** 0..1, one per point. */
	pressures: number[];
	/** Excalidraw freedraw strokeWidth, in scene units. */
	width: number;
}

export const INK_COLOR = "#e03131";

/** Excalidraw draws freedraw this many times wider than strokeWidth. */
export const FREEDRAW_SCALE = 4.25;

/** Line width for a point, close to how Excalidraw draws the kept stroke. */
export function inkWidth(width: number, pressure: number) {
	return width * FREEDRAW_SCALE * (0.4 + 1.2 * pressure);
}

/** Freedraw element fields for a stroke. Pass through restoreElements for the rest. */
export function inkElement(s: Stroke) {
	const [x0, y0] = s.points[0];
	const points = s.points.map(([x, y]) => [x - x0, y - y0] as [number, number]);
	const pressures = [...s.pressures];
	// A tap is one point; Excalidraw wants two to draw a dot.
	if (points.length === 1) {
		points.push([0, 0]);
		pressures.push(pressures[0]);
	}
	const xs = points.map((p) => p[0]);
	const ys = points.map((p) => p[1]);
	return {
		type: "freedraw" as const,
		x: x0,
		y: y0,
		width: Math.max(...xs) - Math.min(...xs),
		height: Math.max(...ys) - Math.min(...ys),
		points,
		pressures,
		simulatePressure: false,
		strokeColor: INK_COLOR,
		strokeWidth: s.width,
		roughness: 0,
		opacity: 100,
	};
}
