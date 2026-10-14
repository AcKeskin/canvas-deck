# canvas-deck

Obsidian plugin for slide decks where each slide is an infinite canvas.

A fully vibe-coded Obsidian plugin I made for myself, built with [contexture](https://github.com/AcKeskin/contexture).

Planning docs: `.claude/visions`, `.claude/specs`, `.claude/plans`.

## Use

- **New deck** or **New demo deck** (command palette, or the ribbon icon) creates a deck note.
- Left: slides. Click to open, double-click to rename, drag or ↑/↓ to reorder.
- Middle: the canvas. The dashed box is the 16:9 start frame. Draw anywhere past it.
- Top: **+ Save view** saves what you see as a step. Click a view to fly to it.
- **Link selection to slide or view** (command palette) makes the selected objects jump to that slide or view when clicked in present mode. You can also type `#cdeck:<slideId>` or `#cdeck:<slideId>/<viewId>` in the link box.
- Bottom: speaker notes. They are plain text in the note, so search finds them.
- **▶ Present**: → / Space next, ← back, Home start frame, N notes, Esc exit. Drag and scroll to move freely.
- Notes on a slide: drag a note from the file explorer onto the canvas, or run **Insert note**. It shows the note live. In the editor, click it to select, click again to open the note in a new tab. In present mode one click leaves present mode and opens the note.
- **Export deck to PDF** saves `<deck>.pdf` next to the note: one page per start frame, and optionally one per saved view. Speaker notes, if picked, are printed under the start frame.
- While presenting: P pen, L laser pointer, K keeps the ink on the slide (otherwise it goes when you leave the slide), G all slides and views to jump to. Esc turns these off first.
- A deck is a markdown note with `canvas-deck` frontmatter. **Open deck as markdown** shows the raw note.

## Dev

- `npm run build` builds `main.js`, `styles.css` and the `fonts/` folder. Copy all of them with `manifest.json` into `<vault>/.obsidian/plugins/canvas-deck/`. The fonts let text draw offline; without the folder, fonts load from the web. Chinese, Japanese and Korean text has no offline hand-drawn font and uses a system font when offline.
- `npm test` runs unit tests.
- `npm run test:e2e` runs browser tests on a test page (`npm run harness` to open it).

## Checking speed in Obsidian

1. Run **New demo deck** and open slide 3 (2,000 objects).
2. Open dev tools (Ctrl+Shift+I), then Rendering > Frame Rendering Stats.
3. Pan, zoom, and present through the saved views.
4. For mobile, run `app.emulateMobile(true)` in the console and repeat.
