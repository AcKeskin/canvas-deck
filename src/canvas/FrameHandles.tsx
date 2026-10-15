import { useRef, useState, type PointerEvent } from "react";
import { moveFrame, resizeFrame, type Corner } from "./frame";
import type { Bounds } from "./slide-data";

export interface FrameHandlesProps {
	frame: Bounds;
	/** Excalidraw camera: screen = (scene + scroll) * zoom. */
	scrollX: number;
	scrollY: number;
	zoom: number;
	keepAspect: boolean;
	onCommit: (frame: Bounds) => void;
}

const CORNERS: Corner[] = ["nw", "ne", "sw", "se"];

/**
 * Start frame with handles: drag inside to move, drag a corner to resize. Works with mouse, touch and pen.
 * Corner events bubble up to the box, so only the box handles move and up.
 */
export function FrameHandles({ frame, scrollX, scrollY, zoom, keepAspect, onCommit }: FrameHandlesProps) {
	const [draft, setDraft] = useState<Bounds | null>(null);
	const drag = useRef<{ id: number; x: number; y: number; corner: Corner | null } | null>(null);
	const f = draft ?? frame;

	const start = (corner: Corner | null) => (e: PointerEvent) => {
		e.stopPropagation();
		e.preventDefault();
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, corner };
	};
	const next = (e: PointerEvent) => {
		const d = drag.current;
		if (!d || d.id !== e.pointerId) return null;
		const dx = (e.clientX - d.x) / zoom;
		const dy = (e.clientY - d.y) / zoom;
		if (!d.corner) return moveFrame(frame, dx, dy);
		return resizeFrame(frame, d.corner, dx, dy, keepAspect ? frame.width / frame.height : null);
	};
	const move = (e: PointerEvent) => {
		const b = next(e);
		if (b) setDraft(b);
	};
	const end = (e: PointerEvent) => {
		const b = next(e);
		drag.current = null;
		setDraft(null);
		if (b) onCommit(b);
	};
	const cancel = () => {
		drag.current = null;
		setDraft(null);
	};

	return (
		<div
			className="canvas-deck-frame is-editing"
			style={{
				position: "absolute",
				left: (f.x + scrollX) * zoom,
				top: (f.y + scrollY) * zoom,
				width: f.width * zoom,
				height: f.height * zoom,
			}}
			onPointerDown={start(null)}
			onPointerMove={move}
			onPointerUp={end}
			onPointerCancel={cancel}
		>
			{CORNERS.map((c) => (
				<div key={c} className={`canvas-deck-frame-handle is-${c}`} onPointerDown={start(c)} />
			))}
		</div>
	);
}
