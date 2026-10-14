import { Excalidraw } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI, ExcalidrawProps } from "@excalidraw/excalidraw/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseDeckLink } from "../deck/deck-links";
import { combineEmbedProps } from "./embed-props";
import { CanvasEngine, type ImageStore, type NoteRenderer } from "./engine";
import { FrameHandles } from "./FrameHandles";
import { noteEmbedProps } from "./NoteEmbed";
import type { SlideData } from "./slide-data";
import { webEmbedProps } from "./WebEmbed";

export interface SlideCanvasProps {
	initial: SlideData;
	images: ImageStore;
	/** Live note embeds. Without it, note embeds show as plain boxes. */
	notes?: NoteRenderer;
	/** Present mode: read-only, no editor UI, no frame outline. */
	presenting?: boolean;
	/** Present mode with the editor tools on. */
	editing?: boolean;
	theme?: "light" | "dark";
	/** Show handles to move and resize the start frame. */
	editFrame?: boolean;
	/** Resize keeps the frame's aspect. */
	keepAspect?: boolean;
	onChange(slide: SlideData): void;
	onReady?(engine: CanvasEngine): void;
	/** Called when a `#cdeck:` link is followed. Other links open as usual. */
	onDeckLink?(slideId: string, viewId?: string): void;
}

/** One slide as an Excalidraw canvas, with the start frame drawn on top. */
export function SlideCanvas({ initial, images, notes, presenting, editing, theme, editFrame, keepAspect, onChange, onReady, onDeckLink }: SlideCanvasProps) {
	const engine = useRef<CanvasEngine | null>(null);
	const host = useRef<HTMLDivElement>(null);
	const down = useRef<{ x: number; y: number } | null>(null);
	const [cam, setCam] = useState<{ scrollX: number; scrollY: number; zoom: number } | null>(null);
	const embedProps = useMemo(() => combineEmbedProps(noteEmbedProps(notes), webEmbedProps), [notes]);
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
				document.fonts.ready.then(() => e.refreshText());
				onReady?.(e);
			});
		},
		[images, initial, onChange, onReady, updateFrame, theme],
	);

	// Stable so Excalidraw's memo skips re-rendering on scroll.
	const onLinkOpen = useCallback<NonNullable<ExcalidrawProps["onLinkOpen"]>>(
		(el, event) => {
			const target = parseDeckLink(el.link);
			if (!target) return embedProps.onLinkOpen?.(el, event);
			event.preventDefault();
			// Present mode follows links in onPointerUp.
			if (!presenting) onDeckLink?.(target.slideId, target.viewId);
		},
		[embedProps, presenting, onDeckLink],
	);

	// In present mode a click or tap anywhere on a linked element follows it.
	// Excalidraw does this on desktop only, so taps are handled here for all devices.
	const onPointerUp = (e: React.PointerEvent) => {
		const start = down.current;
		down.current = null;
		if (!presenting || editing || !start || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) return;
		const target = parseDeckLink(engine.current?.linkAt(e.clientX, e.clientY));
		if (target) onDeckLink?.(target.slideId, target.viewId);
	};

	return (
		<div
			ref={host}
			className={`canvas-deck-slide${presenting && !editing ? " is-presenting" : ""}`}
			style={{ position: "relative", width: "100%", height: "100%" }}
			// A second finger means pinch, not a tap.
			onPointerDownCapture={(e) => (down.current = e.isPrimary ? { x: e.clientX, y: e.clientY } : null)}
			onPointerUpCapture={onPointerUp}
		>
			<Excalidraw
				excalidrawAPI={onApi}
				initialData={{ elements: initial.elements, scrollToContent: false }}
				onChange={(els, state, files) => engine.current?.handleChange(els, state, files)}
				viewModeEnabled={presenting && !editing}
				zenModeEnabled={presenting && !editing}
				theme={theme}
				{...embedProps}
				onLinkOpen={onLinkOpen}
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
