import { deserializeSlide, newId, serializeSlide } from "../canvas/slide-data";
import { createDeck, type Deck, type DeckSlide } from "./deck-model";

/** Frontmatter key that marks a note as a deck. */
export const DECK_FLAG = "canvas-deck";
export const FORMAT_VERSION = 1;

const BLOCK = /^%%cdeck ([^\n]*)\n([^\n]*)\n%%[ \t]*$/gm;

/**
 * Layout per slide:
 *   ## Title
 *   notes...
 *   %%cdeck <id>
 *   {slide json}
 *   %%
 * The %% block hides slide data in reading view; titles and notes stay searchable.
 */
export function serializeDeck(deck: Deck): string {
	const fm = ["---", `${DECK_FLAG}: ${FORMAT_VERSION}`, ...deck.frontmatter, "---"].join("\n");
	const slides = deck.slides.map((s) => {
		const notes = s.notes.trim();
		return `## ${s.title}\n\n${notes ? `${notes}\n\n` : ""}%%cdeck ${s.id}\n${serializeSlide(s.data)}\n%%`;
	});
	return `${fm}\n\n${slides.join("\n\n")}\n`;
}

export function parseDeck(text: string): Deck {
	const { frontmatter, body } = splitFrontmatter(text);
	const flag = frontmatter.find((l) => l.startsWith(`${DECK_FLAG}:`));
	const version = flag ? Number(flag.slice(DECK_FLAG.length + 1).trim()) : FORMAT_VERSION;
	if (version > FORMAT_VERSION) throw new Error(`Deck format ${version} is newer than this plugin supports`);

	const slides: DeckSlide[] = [];
	let last = 0;
	for (const m of body.matchAll(BLOCK)) {
		const { title, notes } = splitHeader(body.slice(last, m.index));
		slides.push({ id: m[1].trim() || newId(), title, notes, data: deserializeSlide(m[2]) });
		last = m.index + m[0].length;
	}
	const tail = body.slice(last).trim();
	if (!slides.length) {
		const deck = createDeck();
		deck.slides[0].notes = tail;
		return { frontmatter: frontmatter.filter((l) => l !== flag), slides: deck.slides };
	}
	// Text after the last block is kept with the last slide rather than dropped.
	if (tail) slides[slides.length - 1].notes = [slides[slides.length - 1].notes, tail].filter(Boolean).join("\n\n");
	return { frontmatter: frontmatter.filter((l) => l !== flag), slides };
}

function splitFrontmatter(text: string): { frontmatter: string[]; body: string } {
	const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
	if (!m) return { frontmatter: [], body: text };
	return { frontmatter: m[1].split(/\r?\n/), body: text.slice(m[0].length) };
}

function splitHeader(chunk: string): { title: string; notes: string } {
	const lines = chunk.trim().split("\n");
	const header = lines[0]?.match(/^##(?:[ \t]+(.*))?$/);
	if (header) return { title: (header[1] ?? "").trim(), notes: lines.slice(1).join("\n").trim() };
	return { title: "", notes: lines.join("\n").trim() };
}
