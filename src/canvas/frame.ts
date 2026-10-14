import type { Bounds } from "./slide-data";

export type FrameAspect = "16:9" | "4:3" | "1:1" | "9:16" | "free";

export const FRAME_ASPECTS: FrameAspect[] = ["16:9", "4:3", "1:1", "9:16", "free"];

/** Width / height, or null for free. */
export function aspectRatio(a: FrameAspect): number | null {
	if (a === "free") return null;
	const [w, h] = a.split(":").map(Number);
	return w / h;
}

/** The named aspect the frame has, or "free" if none is close. */
export function aspectOf(f: Bounds): FrameAspect {
	const r = f.width / f.height;
	const named = FRAME_ASPECTS.find((a) => {
		const ar = aspectRatio(a);
		return ar !== null && Math.abs(r / ar - 1) < 0.01;
	});
	return named ?? "free";
}

/** Same center and about the same area, new aspect. */
export function frameWithAspect(f: Bounds, a: FrameAspect): Bounds {
	const r = aspectRatio(a);
	if (r === null) return f;
	const width = Math.round(Math.sqrt(f.width * f.height * r));
	const height = Math.round(width / r);
	return { x: Math.round(f.x + (f.width - width) / 2), y: Math.round(f.y + (f.height - height) / 2), width, height };
}

export function moveFrame(f: Bounds, dx: number, dy: number): Bounds {
	return { ...f, x: f.x + dx, y: f.y + dy };
}

export type Corner = "nw" | "ne" | "sw" | "se";

/**
 * Drags one corner by (dx, dy) in scene units; the opposite corner stays put.
 * With a ratio the frame keeps that aspect, following the larger change.
 */
export function resizeFrame(f: Bounds, corner: Corner, dx: number, dy: number, ratio: number | null, min = 40): Bounds {
	const west = corner === "nw" || corner === "sw";
	const north = corner === "nw" || corner === "ne";
	let width = Math.max(min, f.width + (west ? -dx : dx));
	let height = Math.max(min, f.height + (north ? -dy : dy));
	if (ratio) {
		if (width / height > ratio) height = width / ratio;
		else width = height * ratio;
	}
	return {
		x: west ? f.x + f.width - width : f.x,
		y: north ? f.y + f.height - height : f.y,
		width,
		height,
	};
}
