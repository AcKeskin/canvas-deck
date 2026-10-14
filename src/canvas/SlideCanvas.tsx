import { Excalidraw } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { parseDeckLink } from "../deck/deck-links";
import { CanvasEngine, type ImageStore } from "./engine";
import type { Bounds, SlideData } from "./slide-data";

export interface SlideCanvasProps {
	initial: SlideData;
	images: ImageStore;
	/** Present mode: read-only, no editor UI, no frame outline. */
	presenting?: boolean;
	theme?: "light" | "dark";
	onChange(slide: SlideData): void;
	onReady?(engine: CanvasEngine): void;
	/** Called when a `#cdeck:` link is followed. Other links open as usual. */
	onDeckLink?(slideId: string, viewId?: string): void;
}

/** One slide as an Excalidraw canvas, with the 16:9 start frame drawn on top. */
export function SlideCanvas({ initial, images, presenting, theme, onChange, onReady, onDeckLink }: SlideCanvasProps) {
	const engine = useRef<CanvasEngine | null>(null);
	const host = useRef<HTMLDivElement>(null);
	const down = useRef<{ x: number; y: number } | null>(null);
	const [frameRect, setFrameRect] = useState<Bounds | null>(null);

	const updateFrame = useCallback((scrollX: number, scrollY: number, zoom: number) => {
		const f = engine.current?.slide.frame ?? initial.frame;
		setFrameRect({ x: (f.x + scrollX) * zoom, y: (f.y + scrollY) * zoom, width: f.width * zoom, height: f.height * zoom });
	}, [initial]);

	useEffect(() => () => engine.current?.dispose(), []);

	const onApi = useCallback(
		(api: ExcalidrawImperativeAPI) => {
			if (engine.current) return;
			const e = new CanvasEngine(api, images, initial, onChange);
			engine.current = e;
			if (host.current) e.enableMotion(host.current, () => theme === "dark");
			api.onScrollChange((x, y, z) => updateFrame(x, y, z.value));
			// Excalidraw needs one frame to size itself before the camera can fit.
			requestAnimationFrame(() => {
				e.camera.goToFrame(initial, { animate: false });
				e.loadImages();
				onReady?.(e);
			});
		},
		[images, initial, onChange, onReady, updateFrame, theme],
	);

	// In present mode a click or tap anywhere on a linked element follows it.
	// Excalidraw does this on desktop only, so taps are handled here for all devices.
	const onPointerUp = (e: React.PointerEvent) => {
		const start = down.current;
		down.current = null;
		if (!presenting || !start || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) return;
		const target = parseDeckLink(engine.current?.linkAt(e.clientX, e.clientY));
		if (target) onDeckLink?.(target.slideId, target.viewId);
	};

	return (
		<div
			ref={host}
			className={`canvas-deck-slide${presenting ? " is-presenting" : ""}`}
			style={{ position: "relative", width: "100%", height: "100%" }}
			// A second finger means pinch, not a tap.
			onPointerDownCapture={(e) => (down.current = e.isPrimary ? { x: e.clientX, y: e.clientY } : null)}
			onPointerUpCapture={onPointerUp}
		>
			<Excalidraw
				excalidrawAPI={onApi}
				initialData={{ elements: initial.elements, scrollToContent: false }}
				onChange={(els, state, files) => engine.current?.handleChange(els, state, files)}
				viewModeEnabled={presenting}
				zenModeEnabled={presenting}
				theme={theme}
				onLinkOpen={(el, event) => {
					const target = parseDeckLink(el.link);
					if (!target) return;
					event.preventDefault();
					// Present mode follows links in onPointerUp.
					if (!presenting) onDeckLink?.(target.slideId, target.viewId);
				}}
			/>
			{frameRect && !presenting && (
				<div
					className="canvas-deck-frame"
					style={{
						position: "absolute",
						left: frameRect.x,
						top: frameRect.y,
						width: frameRect.width,
						height: frameRect.height,
						border: "2px dashed var(--interactive-accent, #6965db)",
						pointerEvents: "none",
						boxSizing: "border-box",
					}}
				/>
			)}
		</div>
	);
}
