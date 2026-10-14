import type { ExcalidrawProps } from "@excalidraw/excalidraw/types";
import { useEffect, useRef } from "react";
import type { NoteRenderer } from "./engine";
import { parseNoteLink } from "./note-links";

/** A live note on the canvas. A click opens the note. */
function NoteEmbed({ path, notes }: { path: string; notes: NoteRenderer }) {
	const ref = useRef<HTMLDivElement>(null);
	useEffect(() => (ref.current ? notes.render(path, ref.current) : undefined), [path, notes]);
	return <div ref={ref} className="canvas-deck-note markdown-rendered" title={path} onClick={() => notes.open(path)} />;
}

/** Excalidraw props that turn embeddables with note links into live notes. */
export function noteEmbedProps(notes?: NoteRenderer): Partial<ExcalidrawProps> {
	if (!notes) return {};
	return {
		validateEmbeddable: (link) => (parseNoteLink(link) ? true : undefined),
		renderEmbeddable: (el) => {
			const path = parseNoteLink(el.link);
			return path ? <NoteEmbed path={path} notes={notes} /> : null;
		},
		// The link icon on a selected note.
		onLinkOpen: (el, e) => {
			const path = parseNoteLink(el.link);
			if (!path) return;
			e.preventDefault();
			notes.open(path);
		},
	};
}
