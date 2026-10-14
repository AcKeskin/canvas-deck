import { Excalidraw } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { CanvasEngine, type ImageStore } from "./engine";
import { FrameHandles } from "./FrameHandles";
import type { SlideData } from "./slide-data";

export interface SlideCanvasProps {
	initial: SlideData;
	images: ImageStore;
	/** Present mode: read-only, no editor UI, no frame outline. */
	presenting?: boolean;
	theme?: "light" | "dark";
	/** Show handles to move and resize the start frame. */
	editFrame?: boolean;
	/** Resize keeps the frame's aspect. */
	keepAspect?: boolean;
	onChange(slide: SlideData): void;
	onReady?(engine: CanvasEngine): void;
}

/** One slide as an Excalidraw canvas, with the start frame drawn on top. */
export function SlideCanvas({ initial, images, presenting, theme, editFrame, keepAspect, onChange, onReady }: SlideCanvasProps) {
	const engine = useRef<CanvasEngine | null>(null);
	const host = useRef<HTMLDivElement>(null);
	const [cam, setCam] = useState<{ scrollX: number; scrollY: number; zoom: number } | null>(null);
	// Read at render: the parent re-renders after every slide change, frame edits included.
	const f = engine.current?.slide.frame ?? initial.frame;

	const updateFrame = useCallback((scrollX: number, scrollY: number, zoom: number) => setCam({ scrollX, scrollY, zoom }), []);

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

	return (
		<div ref={host} className={`canvas-deck-slide${presenting ? " is-presenting" : ""}`} style={{ position: "relative", width: "100%", height: "100%" }}>
			<Excalidraw
				excalidrawAPI={onApi}
				initialData={{ elements: initial.elements, scrollToContent: false }}
				onChange={(els, state, files) => engine.current?.handleChange(els, state, files)}
				viewModeEnabled={presenting}
				zenModeEnabled={presenting}
				theme={theme}
			/>
			{cam && !presenting && editFrame && (
				<FrameHandles frame={f} {...cam} keepAspect={!!keepAspect} onCommit={(b) => engine.current?.setFrame(b)} />
			)}
			{cam && !presenting && !editFrame && (
				<div
					className="canvas-deck-frame"
					style={{
						position: "absolute",
						left: (f.x + cam.scrollX) * cam.zoom,
						top: (f.y + cam.scrollY) * cam.zoom,
						width: f.width * cam.zoom,
						height: f.height * cam.zoom,
						border: "2px dashed var(--interactive-accent, #6965db)",
						pointerEvents: "none",
						boxSizing: "border-box",
					}}
				/>
			)}
		</div>
	);
}
