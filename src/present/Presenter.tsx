import { useCallback, useEffect, useRef, useState } from "react";
import type { CanvasEngine, ImageStore, NoteRenderer } from "../canvas/engine";
import type { SlideData } from "../canvas/slide-data";
import { SlideCanvas } from "../canvas/SlideCanvas";
import { resolveDeckLink } from "../deck/deck-links";
import type { Deck } from "../deck/deck-model";
import { Thumb } from "../deck/Thumb";
import { inkElement, type Stroke } from "./ink";
import { InkLayer, type InkTool } from "./InkLayer";
import { next, prev, type Position } from "./stepper";

export interface PresenterProps {
	deck: Deck;
	images: ImageStore;
	notes?: NoteRenderer;
	start?: number;
	theme?: "light" | "dark";
	onExit(): void;
	onEngine?(engine: CanvasEngine): void;
	/** A slide changed while presenting (kept ink). */
	onSlideData?(id: string, data: SlideData): void;
}

/**
 * Fullscreen player. Arrows/space step through saved views, then slides.
 * Drag and wheel move freely inside a slide; Home returns to the start frame.
 * P draws, L shows a laser pointer, K keeps the ink on the slide, G shows all slides.
 */
export function Presenter({ deck, images, notes, start = 0, theme, onExit, onEngine, onSlideData }: PresenterProps) {
	const root = useRef<HTMLDivElement>(null);
	const engine = useRef<CanvasEngine | null>(null);
	const [pos, setPos] = useState<Position>({ slide: start, view: -1 });
	const [showNotes, setShowNotes] = useState(false);
	const [showGrid, setShowGrid] = useState(false);
	const [tool, setTool] = useState<InkTool | null>(null);
	const [strokes, setStrokes] = useState<Stroke[]>([]);
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
			// A deck link or the grid can land on a view of another slide.
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

	// Ink is thrown away when leaving the slide, unless kept.
	useEffect(() => setStrokes([]), [pos.slide]);

	// Only kept ink is saved; the canvas also reports a change when it opens.
	const keeping = useRef(false);
	const keepInk = useCallback(() => {
		if (!strokes.length || !engine.current) return;
		keeping.current = true;
		engine.current.addElements(strokes.map(inkElement));
		setStrokes([]);
	}, [strokes]);

	const toggleTool = (t: InkTool) => setTool((cur) => (cur === t ? null : t));

	const jump = (p: Position) => {
		setPos(p);
		setShowGrid(false);
	};

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
			} else if (k === "Escape") {
				if (showGrid) setShowGrid(false);
				else if (tool) setTool(null);
				else onExit();
			} else if (k === "n" || k === "N") setShowNotes((v) => !v);
			else if (k === "g" || k === "G") setShowGrid((v) => !v);
			else if (k === "p" || k === "P") toggleTool("pen");
			else if (k === "l" || k === "L") toggleTool("laser");
			else if (k === "k" || k === "K") keepInk();
			else handled = false;
			if (handled) {
				e.preventDefault();
				e.stopPropagation();
			}
		};
		window.addEventListener("keydown", onKey, true);
		return () => window.removeEventListener("keydown", onKey, true);
	}, [shape.join(","), onExit, showGrid, tool, keepInk]);

	return (
		<div className={`canvas-deck-presenter${tool ? ` is-${tool}` : ""}`} ref={root}>
			<SlideCanvas
				key={slide.id}
				initial={slide.data}
				images={images}
				notes={notes}
				presenting
				theme={theme}
				onChange={(data) => {
					if (keeping.current) onSlideData?.(slide.id, data);
					keeping.current = false;
				}}
				onReady={onReady}
				onDeckLink={onDeckLink}
			/>
			<InkLayer engine={engine} tool={tool} strokes={strokes} onStroke={(s) => setStrokes((all) => [...all, s])} />
			{showNotes && slide.notes && <div className="canvas-deck-present-notes">{slide.notes}</div>}
			<div className="canvas-deck-present-bar">
				<button aria-label="Previous" onClick={() => setPos((p) => prev(p, shape))}>‹</button>
				<span>
					{pos.slide + 1} / {deck.slides.length}
					{pos.view >= 0 && ` · ${slide.data.views[pos.view].name}`}
				</span>
				<button aria-label="Next" onClick={() => setPos((p) => next(p, shape))}>›</button>
				<button aria-label="Pen" title="Pen (P)" className={tool === "pen" ? "is-active" : ""} onClick={() => toggleTool("pen")}>
					✎
				</button>
				<button aria-label="Laser" title="Laser (L)" className={tool === "laser" ? "is-active" : ""} onClick={() => toggleTool("laser")}>
					◉
				</button>
				{strokes.length > 0 && (
					<button title="Add the ink to the slide (K)" onClick={keepInk}>
						Keep ink
					</button>
				)}
				<button aria-label="All slides" title="All slides (G)" onClick={() => setShowGrid((v) => !v)}>▦</button>
				<button aria-label="Exit" onClick={onExit}>✕</button>
			</div>
			{showGrid && (
				<div className="canvas-deck-grid" aria-label="Slide grid">
					{deck.slides.map((s, i) => (
						<div key={s.id} className={`canvas-deck-grid-item${i === pos.slide ? " is-active" : ""}`}>
							<button className="canvas-deck-grid-slide" onClick={() => jump({ slide: i, view: -1 })}>
								<Thumb data={s.data} images={images} />
								<span className="canvas-deck-list-label">
									<span className="num">{i + 1}</span> {s.title || "Untitled"}
								</span>
							</button>
							{s.data.views.map((v, j) => (
								<button key={v.id} className="canvas-deck-grid-view" onClick={() => jump({ slide: i, view: j })}>
									{v.name}
								</button>
							))}
						</div>
					))}
				</div>
			)}
		</div>
	);
}
