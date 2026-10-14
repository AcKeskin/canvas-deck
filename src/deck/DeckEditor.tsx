import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CanvasEngine, ImageStore, NoteRenderer } from "../canvas/engine";
import { SlideCanvas } from "../canvas/SlideCanvas";
import { moveView, removeView, renameView } from "../canvas/camera";
import { aspectOf, FRAME_ASPECTS, frameWithAspect, type FrameAspect } from "../canvas/frame";
import type { SlideData } from "../canvas/slide-data";
import { Presenter } from "../present/Presenter";
import { resolveDeckLink } from "./deck-links";
import { Thumb } from "./Thumb";
import { addSlide, deleteSlide, duplicateSlide, insertSlide, moveSlide, updateSlide, type Deck, type DeckSlide } from "./deck-model";

export interface DeckHandle {
	present(from?: number): void;
	currentSlide(): DeckSlide;
	/** Inserts a copy of the slide after the current one and opens it. */
	insertSlide(slide: DeckSlide): void;
}

export interface DeckEditorProps {
	initial: Deck;
	images: ImageStore;
	notes?: NoteRenderer;
	theme?: "light" | "dark";
	onChange(deck: Deck): void;
	onReady?(handle: DeckHandle): void;
	/** The current slide's canvas, for commands that act on it. */
	onEngine?(engine: CanvasEngine): void;
}

/** Deck editing screen: slide list, canvas, saved views and speaker notes. */
export function DeckEditor({ initial, images, notes, theme, onChange, onReady, onEngine }: DeckEditorProps) {
	const [deck, setDeck] = useState(initial);
	const [current, setCurrent] = useState(0);
	const [presenting, setPresenting] = useState<number | null>(null);
	const [editFrame, setEditFrame] = useState(false);
	// Slide whose frame the user set to free; other frames show their named aspect.
	const [freeSlide, setFreeSlide] = useState<string | null>(null);
	// The view chip clicked last; its notes show in the notes box.
	const [activeView, setActiveView] = useState<{ slide: string; view: string } | null>(null);
	const engine = useRef<CanvasEngine | null>(null);
	/** View to fly to once the next slide's canvas is ready. */
	const pendingView = useRef<string | null>(null);
	const first = useRef(true);
	const deckRef = useRef(deck);
	deckRef.current = deck;
	const slide = deck.slides[Math.min(current, deck.slides.length - 1)];

	useEffect(() => {
		if (first.current) {
			first.current = false;
			return;
		}
		onChange(deck);
	}, [deck]);

	useEffect(() => {
		onReady?.({
			present: (from) => setPresenting(from ?? current),
			currentSlide: () => deckRef.current.slides[Math.min(current, deckRef.current.slides.length - 1)],
			insertSlide: (s) => {
				setDeck((d) => insertSlide(d, s, current));
				setCurrent(current + 1);
			},
		});
	}, [current, onReady]);

	const edit = (fn: (d: Deck) => Deck) => setDeck(fn);
	const select = (i: number) => setCurrent(Math.max(0, Math.min(i, deck.slides.length - 1)));

	// Presenter's canvas is gone after exit; point commands back at the editor's.
	const exitPresent = useCallback(() => {
		setPresenting(null);
		if (engine.current) onEngine?.(engine.current);
	}, [onEngine]);

	// Opening a note from present mode exits present first.
	const presentNotes = useMemo<NoteRenderer | undefined>(
		() =>
			notes && {
				render: (path, el) => notes.render(path, el),
				open: (path) => {
					exitPresent();
					notes.open(path);
				},
			},
		[notes, exitPresent],
	);

	const onSlideData = useCallback(
		(id: string) => (data: SlideData) => setDeck((d) => updateSlide(d, id, { data })),
		[],
	);

	// Following a deck link selects that slide and flies to the view.
	const followLink = (slideId: string, viewId?: string) => {
		const p = resolveDeckLink(deck, slideId, viewId);
		if (!p) return;
		const target = deck.slides[p.slide];
		const view = p.view >= 0 ? target.data.views[p.view].id : null;
		const e = engine.current;
		if (target.id !== slide.id) {
			pendingView.current = view;
			setCurrent(p.slide);
		} else if (e) {
			if (view) e.camera.goToView(e.slide, view);
			else e.camera.goToFrame(e.slide);
		}
	};
	const keepSlideData = useCallback((id: string, data: SlideData) => setDeck((d) => updateSlide(d, id, { data })), []);

	const views = slide.data.views;
	const view = activeView?.slide === slide.id ? views.find((v) => v.id === activeView.view) : undefined;
	const aspect: FrameAspect = freeSlide === slide.id ? "free" : aspectOf(slide.data.frame);

	const setAspect = (a: FrameAspect) => {
		setFreeSlide(a === "free" ? slide.id : null);
		const e = engine.current;
		if (!e || a === "free") return;
		e.setFrame(frameWithAspect(e.slide.frame, a));
		e.camera.goToFrame(e.slide);
	};

	return (
		<div className="canvas-deck-editor">
			<SlideList
				deck={deck}
				images={images}
				current={current}
				onSelect={select}
				onAdd={() => {
					edit((d) => addSlide(d, current));
					setCurrent(current + 1);
				}}
				onDuplicate={() => {
					edit((d) => duplicateSlide(d, current));
					setCurrent(current + 1);
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
						<button
							onClick={() => {
								setActiveView(null);
								engine.current?.camera.goToFrame(slide.data);
							}}
							title="Back to the start frame"
						>
							Frame
						</button>
						{views.map((v, i) => (
							<span key={v.id} className={`canvas-deck-view-chip${v === view ? " is-active" : ""}`}>
								<button
									onClick={() => {
										setActiveView({ slide: slide.id, view: v.id });
										engine.current?.camera.goToView(engine.current.slide, v.id);
									}}
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
					<select
						aria-label="Frame aspect"
						title="Start frame aspect"
						value={aspect}
						onChange={(e) => setAspect(e.target.value as FrameAspect)}
					>
						{FRAME_ASPECTS.map((a) => (
							<option key={a} value={a}>
								{a === "free" ? "Free" : a}
							</option>
						))}
					</select>
					<button
						className={editFrame ? "is-active" : ""}
						aria-pressed={editFrame}
						onClick={() => {
							setEditFrame(!editFrame);
							// Zoom out a little so the corner handles are on screen.
							const e = engine.current;
							if (!editFrame && e) {
								const f = e.slide.frame;
								e.camera.goToBounds({ x: f.x - f.width * 0.1, y: f.y - f.height * 0.1, width: f.width * 1.2, height: f.height * 1.2 });
							}
						}}
						title="Move and resize the start frame"
					>
						Edit frame
					</button>
					<button className="mod-cta canvas-deck-present-btn" onClick={() => setPresenting(current)}>
						▶ Present
					</button>
				</div>
				<div className="canvas-deck-canvas">
					<SlideCanvas
						key={slide.id}
						initial={slide.data}
						images={images}
						notes={notes}
						theme={theme}
						editFrame={editFrame}
						keepAspect={aspect !== "free"}
						onChange={onSlideData(slide.id)}
						onReady={(e) => {
							engine.current = e;
							if (pendingView.current) e.camera.goToView(e.slide, pendingView.current, { animate: false });
							pendingView.current = null;
							onEngine?.(e);
						}}
						onDeckLink={followLink}
					/>
				</div>
				<div className="canvas-deck-notes-box">
					<div className="canvas-deck-notes-label">{view ? `Notes — view: ${view.name}` : "Notes — slide"}</div>
					<textarea
						className="canvas-deck-notes"
						placeholder={view ? "Notes for this view (shown in present mode at this step)" : "Speaker notes"}
						value={view ? (view.notes ?? "") : slide.notes}
						onChange={(e) => {
							const notes = e.target.value;
							const en = engine.current;
							if (view && en) en.setViews(en.slide.views.map((v) => (v.id === view.id ? { ...v, notes } : v)));
							else edit((d) => updateSlide(d, slide.id, { notes }));
						}}
					/>
				</div>
			</div>
			{presenting !== null && (
				<Presenter
					deck={deck}
					images={images}
					notes={presentNotes}
					start={presenting}
					theme={theme}
					onExit={exitPresent}
					onEngine={onEngine}
					onSlideData={keepSlideData}
				/>
			)}
		</div>
	);
}

interface SlideListProps {
	deck: Deck;
	images: ImageStore;
	current: number;
	onSelect(i: number): void;
	onAdd(): void;
	onDuplicate(): void;
	onDelete(): void;
	onMove(from: number, to: number): void;
	onRename(i: number, title: string): void;
}

function SlideList({ deck, images, current, onSelect, onAdd, onDuplicate, onDelete, onMove, onRename }: SlideListProps) {
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
						<Thumb data={s.data} images={images} />
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
