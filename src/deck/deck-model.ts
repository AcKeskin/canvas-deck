import { createSlide, newId, type SlideData } from "../canvas/slide-data";

export interface DeckSlide {
	id: string;
	title: string;
	/** Speaker notes, plain markdown. */
	notes: string;
	data: SlideData;
}

export interface Deck {
	/** Frontmatter lines other than the deck flag, kept as-is. */
	frontmatter: string[];
	slides: DeckSlide[];
}

export function newSlide(title: string): DeckSlide {
	return { id: newId(), title, notes: "", data: createSlide() };
}

export function createDeck(): Deck {
	return { frontmatter: [], slides: [newSlide("Slide 1")] };
}

export function addSlide(deck: Deck, afterIndex = deck.slides.length - 1): Deck {
	const slides = [...deck.slides];
	slides.splice(afterIndex + 1, 0, newSlide(`Slide ${deck.slides.length + 1}`));
	return { ...deck, slides };
}

export function duplicateSlide(deck: Deck, index: number): Deck {
	const src = deck.slides[index];
	if (!src) return deck;
	const copy: DeckSlide = { ...structuredClone(src), id: newId(), title: `${src.title} copy` };
	const slides = [...deck.slides];
	slides.splice(index + 1, 0, copy);
	return { ...deck, slides };
}

/** Inserts a copy of `slide` (new ids) after `afterIndex`. Used for templates. */
export function insertSlide(deck: Deck, slide: DeckSlide, afterIndex: number): Deck {
	const copy = structuredClone(slide);
	copy.id = newId();
	copy.data.views = copy.data.views.map((v) => ({ ...v, id: newId() }));
	const slides = [...deck.slides];
	slides.splice(afterIndex + 1, 0, copy);
	return { ...deck, slides };
}

/** Never removes the last slide. */
export function deleteSlide(deck: Deck, index: number): Deck {
	if (deck.slides.length <= 1) return deck;
	return { ...deck, slides: deck.slides.filter((_, i) => i !== index) };
}

export function moveSlide(deck: Deck, from: number, to: number): Deck {
	const slides = [...deck.slides];
	const [s] = slides.splice(from, 1);
	if (!s) return deck;
	slides.splice(Math.max(0, Math.min(to, slides.length)), 0, s);
	return { ...deck, slides };
}

export function updateSlide(deck: Deck, id: string, patch: Partial<Omit<DeckSlide, "id">>): Deck {
	return { ...deck, slides: deck.slides.map((s) => (s.id === id ? { ...s, ...patch } : s)) };
}
