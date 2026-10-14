import { useCallback, useEffect, useRef, useState } from "react";
import type { CanvasEngine, ImageStore } from "../canvas/engine";
import { SlideCanvas } from "../canvas/SlideCanvas";
import { resolveDeckLink } from "../deck/deck-links";
import type { Deck } from "../deck/deck-model";
import { next, prev, type Position } from "./stepper";

export interface PresenterProps {
	deck: Deck;
	images: ImageStore;
	start?: number;
	theme?: "light" | "dark";
	onExit(): void;
	onEngine?(engine: CanvasEngine): void;
}

/**
 * Fullscreen player. Arrows/space step through saved views, then slides.
 * Drag and wheel move freely inside a slide; Home returns to the start frame.
 */
export function Presenter({ deck, images, start = 0, theme, onExit, onEngine }: PresenterProps) {
	const root = useRef<HTMLDivElement>(null);
	const engine = useRef<CanvasEngine | null>(null);
	const [pos, setPos] = useState<Position>({ slide: start, view: -1 });
	const [showNotes, setShowNotes] = useState(false);
	const shape = deck.slides.map((s) => s.data.views.length);
	const slide = deck.slides[pos.slide];

	// Moves the camera when the position changes inside the same slide.
	const lastSlide = useRef(pos.slide);
	useEffect(() => {
		const e = engine.current;
		if (!e || lastSlide.current !== pos.slide) return;
		if (pos.view < 0) e.camera.goToFrame(e.slide);
		else e.camera.goToView(e.slide, e.slide.views[pos.view].id);
	}, [pos]);

	const onReady = useCallback(
		(e: CanvasEngine) => {
			engine.current = e;
			lastSlide.current = pos.slide;
			// A deck link can land on a view of another slide.
			if (pos.view >= 0) e.camera.goToView(e.slide, e.slide.views[pos.view].id, { animate: false });
			onEngine?.(e);
		},
		[pos.slide, pos.view, onEngine],
	);

	const onDeckLink = useCallback(
		(slideId: string, viewId?: string) => {
			const p = resolveDeckLink(deck, slideId, viewId);
			if (p) setPos(p);
		},
		[deck],
	);

	useEffect(() => {
		const el = root.current;
		el?.requestFullscreen?.().catch(() => {});
		const onFsChange = () => {
			if (!document.fullscreenElement && el?.isConnected) onExit();
		};
		document.addEventListener("fullscreenchange", onFsChange);
		return () => {
			document.removeEventListener("fullscreenchange", onFsChange);
			if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
		};
	}, [onExit]);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			const k = e.key;
			let handled = true;
			if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(k)) setPos((p) => next(p, shape));
			else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(k)) setPos((p) => prev(p, shape));
			else if (k === "Home") {
				setPos((p) => ({ ...p, view: -1 }));
				engine.current?.camera.goToFrame(engine.current.slide);
			} else if (k === "Escape") onExit();
			else if (k === "n" || k === "N") setShowNotes((v) => !v);
			else handled = false;
			if (handled) {
				e.preventDefault();
				e.stopPropagation();
			}
		};
		window.addEventListener("keydown", onKey, true);
		return () => window.removeEventListener("keydown", onKey, true);
	}, [shape.join(","), onExit]);

	return (
		<div className="canvas-deck-presenter" ref={root}>
			<SlideCanvas
				key={slide.id}
				initial={slide.data}
				images={images}
				presenting
				theme={theme}
				onChange={() => {}}
				onReady={onReady}
				onDeckLink={onDeckLink}
			/>
			{showNotes && slide.notes && <div className="canvas-deck-present-notes">{slide.notes}</div>}
			<div className="canvas-deck-present-bar">
				<button aria-label="Previous" onClick={() => setPos((p) => prev(p, shape))}>‹</button>
				<span>
					{pos.slide + 1} / {deck.slides.length}
					{pos.view >= 0 && ` · ${slide.data.views[pos.view].name}`}
				</span>
				<button aria-label="Next" onClick={() => setPos((p) => next(p, shape))}>›</button>
				<button aria-label="Exit" onClick={onExit}>✕</button>
			</div>
		</div>
	);
}
