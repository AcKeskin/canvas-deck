import { convertToExcalidrawElements, exportToSvg } from "@excalidraw/excalidraw";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CanvasEngine, ImageStore } from "../canvas/engine";
import { SlideCanvas } from "../canvas/SlideCanvas";
import { moveView, removeView, renameView } from "../canvas/camera";
import type { SlideData } from "../canvas/slide-data";
import { Presenter } from "../present/Presenter";
import { addSlide, deleteSlide, duplicateSlide, moveSlide, updateSlide, type Deck } from "./deck-model";

export interface DeckHandle {
	present(from?: number): void;
}

export interface DeckEditorProps {
	initial: Deck;
	images: ImageStore;
	theme?: "light" | "dark";
	onChange(deck: Deck): void;
	onReady?(handle: DeckHandle): void;
	/** The current slide's canvas, for commands that act on it. */
	onEngine?(engine: CanvasEngine): void;
}

/** Deck editing screen: slide list, canvas, saved views and speaker notes. */
export function DeckEditor({ initial, images, theme, onChange, onReady, onEngine }: DeckEditorProps) {
	const [deck, setDeck] = useState(initial);
	const [current, setCurrent] = useState(0);
	const [presenting, setPresenting] = useState<number | null>(null);
	const engine = useRef<CanvasEngine | null>(null);
	const first = useRef(true);
	const slide = deck.slides[Math.min(current, deck.slides.length - 1)];

	useEffect(() => {
		if (first.current) {
			first.current = false;
			return;
		}
		onChange(deck);
	}, [deck]);

	useEffect(() => {
		onReady?.({ present: (from) => setPresenting(from ?? current) });
	}, [current, onReady]);

	const edit = (fn: (d: Deck) => Deck) => setDeck(fn);
	const select = (i: number) => setCurrent(Math.max(0, Math.min(i, deck.slides.length - 1)));

	const onSlideData = useCallback(
		(id: string) => (data: SlideData) => setDeck((d) => updateSlide(d, id, { data })),
		[],
	);

	const views = slide.data.views;

	return (
		<div className="canvas-deck-editor">
			<SlideList
				deck={deck}
				current={current}
				onSelect={select}
				onAdd={() => {
					edit((d) => addSlide(d, current));
					select(current + 1);
				}}
				onDuplicate={() => {
					edit((d) => duplicateSlide(d, current));
					select(current + 1);
				}}
				onDelete={() => {
					edit((d) => deleteSlide(d, current));
					select(current - 1);
				}}
				onMove={(from, to) => {
					edit((d) => moveSlide(d, from, to));
					select(to);
				}}
				onRename={(i, title) => edit((d) => updateSlide(d, d.slides[i].id, { title }))}
			/>
			<div className="canvas-deck-main">
				<div className="canvas-deck-toolbar">
					<input
						className="canvas-deck-title"
						value={slide.title}
						aria-label="Slide title"
						onChange={(e) => edit((d) => updateSlide(d, slide.id, { title: e.target.value }))}
					/>
					<div className="canvas-deck-views" aria-label="Saved views">
						<button onClick={() => engine.current?.camera.goToFrame(slide.data)} title="Back to the start frame">
							Frame
						</button>
						{views.map((v, i) => (
							<span key={v.id} className="canvas-deck-view-chip">
								<button
									onClick={() => engine.current?.camera.goToView(engine.current.slide, v.id)}
									onDoubleClick={() => {
										const name = window.prompt("View name", v.name);
										if (name) engine.current?.setViews(renameView(engine.current.slide, v.id, name).views);
									}}
									title="Go to view (double-click to rename)"
								>
									{v.name}
								</button>
								{i > 0 && (
									<button
										className="chip-x"
										title="Move earlier"
										onClick={() => engine.current?.setViews(moveView(engine.current.slide, i, i - 1).views)}
									>
										‹
									</button>
								)}
								<button
									className="chip-x"
									title="Delete view"
									onClick={() => engine.current?.setViews(removeView(engine.current.slide, v.id).views)}
								>
									×
								</button>
							</span>
						))}
						<button
							onClick={() => engine.current?.saveCurrentView(`View ${views.length + 1}`)}
							title="Save what you see now as a step in present mode"
						>
							+ Save view
						</button>
					</div>
					<button className="mod-cta canvas-deck-present-btn" onClick={() => setPresenting(current)}>
						▶ Present
					</button>
				</div>
				<div className="canvas-deck-canvas">
					<SlideCanvas
						key={slide.id}
						initial={slide.data}
						images={images}
						theme={theme}
						onChange={onSlideData(slide.id)}
						onReady={(e) => {
							engine.current = e;
							onEngine?.(e);
						}}
					/>
				</div>
				<textarea
					className="canvas-deck-notes"
					placeholder="Speaker notes"
					value={slide.notes}
					onChange={(e) => edit((d) => updateSlide(d, slide.id, { notes: e.target.value }))}
				/>
			</div>
			{presenting !== null && (
				<Presenter
					deck={deck}
					images={images}
					start={presenting}
					theme={theme}
					onExit={() => setPresenting(null)}
					onEngine={onEngine}
				/>
			)}
		</div>
	);
}

interface SlideListProps {
	deck: Deck;
	current: number;
	onSelect(i: number): void;
	onAdd(): void;
	onDuplicate(): void;
	onDelete(): void;
	onMove(from: number, to: number): void;
	onRename(i: number, title: string): void;
}

function SlideList({ deck, current, onSelect, onAdd, onDuplicate, onDelete, onMove, onRename }: SlideListProps) {
	const drag = useRef<number | null>(null);
	return (
		<div className="canvas-deck-list">
			<div className="canvas-deck-list-items">
				{deck.slides.map((s, i) => (
					<div
						key={s.id}
						className={`canvas-deck-list-item${i === current ? " is-active" : ""}`}
						draggable
						onDragStart={() => (drag.current = i)}
						onDragOver={(e) => e.preventDefault()}
						onDrop={() => {
							if (drag.current !== null && drag.current !== i) onMove(drag.current, i);
							drag.current = null;
						}}
						onClick={() => onSelect(i)}
						onDoubleClick={() => {
							const t = window.prompt("Slide title", s.title);
							if (t !== null) onRename(i, t);
						}}
					>
						<Thumb data={s.data} />
						<div className="canvas-deck-list-label">
							<span className="num">{i + 1}</span> {s.title || "Untitled"}
						</div>
					</div>
				))}
			</div>
			<div className="canvas-deck-list-actions">
				<button onClick={onAdd} title="Add slide">+</button>
				<button onClick={onDuplicate} title="Duplicate slide">⧉</button>
				<button onClick={() => onMove(current, current - 1)} disabled={current === 0} title="Move up">↑</button>
				<button onClick={() => onMove(current, current + 1)} disabled={current === deck.slides.length - 1} title="Move down">↓</button>
				<button onClick={onDelete} disabled={deck.slides.length <= 1} title="Delete slide">🗑</button>
			</div>
		</div>
	);
}

/** Small preview of the slide's start frame, redrawn shortly after its content changes. */
function Thumb({ data }: { data: SlideData }) {
	const ref = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const t = window.setTimeout(async () => {
			const el = ref.current;
			if (!el) return;
			const f = data.frame;
			// An invisible rectangle pins the export to the start frame.
			const [pin] = convertToExcalidrawElements([
				{ type: "rectangle", x: f.x, y: f.y, width: f.width, height: f.height, opacity: 0, strokeColor: "transparent" },
			]);
			const inFrame = data.elements.filter(
				(e) => e.x < f.x + f.width && e.x + e.width > f.x && e.y < f.y + f.height && e.y + e.height > f.y,
			);
			try {
				const svg = await exportToSvg({
					elements: [pin, ...inFrame],
					files: null,
					appState: { exportBackground: false, exportPadding: 0 } as any,
					exportPadding: 0,
				});
				svg.setAttribute("width", "100%");
				svg.setAttribute("height", "100%");
				el.replaceChildren(svg);
			} catch {
				el.replaceChildren();
			}
		}, 600);
		return () => window.clearTimeout(t);
	}, [data]);
	return <div className="canvas-deck-thumb" ref={ref} />;
}
