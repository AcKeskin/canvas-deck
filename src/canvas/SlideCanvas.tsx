import { Excalidraw } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CanvasEngine, type ImageStore, type NoteRenderer } from "./engine";
import { noteEmbedProps } from "./NoteEmbed";
import type { Bounds, SlideData } from "./slide-data";

export interface SlideCanvasProps {
	initial: SlideData;
	images: ImageStore;
	/** Live note embeds. Without it, note embeds show as plain boxes. */
	notes?: NoteRenderer;
	/** Present mode: read-only, no editor UI, no frame outline. */
	presenting?: boolean;
	theme?: "light" | "dark";
	onChange(slide: SlideData): void;
	onReady?(engine: CanvasEngine): void;
}

/** One slide as an Excalidraw canvas, with the 16:9 start frame drawn on top. */
export function SlideCanvas({ initial, images, notes, presenting, theme, onChange, onReady }: SlideCanvasProps) {
	const engine = useRef<CanvasEngine | null>(null);
	const host = useRef<HTMLDivElement>(null);
	const [frameRect, setFrameRect] = useState<Bounds | null>(null);
	const embedProps = useMemo(() => noteEmbedProps(notes), [notes]);

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

	return (
		<div ref={host} className={`canvas-deck-slide${presenting ? " is-presenting" : ""}`} style={{ position: "relative", width: "100%", height: "100%" }}>
			<Excalidraw
				excalidrawAPI={onApi}
				initialData={{ elements: initial.elements, scrollToContent: false }}
				onChange={(els, state, files) => engine.current?.handleChange(els, state, files)}
				viewModeEnabled={presenting}
				zenModeEnabled={presenting}
				theme={theme}
				{...embedProps}
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
