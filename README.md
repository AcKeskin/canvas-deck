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
- A deck is a markdown note with `canvas-deck` frontmatter. **Open deck as markdown** shows the raw note.

## Dev

- `npm run build` builds `main.js` and `styles.css`. Copy them with `manifest.json` into `<vault>/.obsidian/plugins/canvas-deck/`.
- `npm test` runs unit tests.
- `npm run test:e2e` runs browser tests on a test page (`npm run harness` to open it).

## Checking speed in Obsidian

1. Run **New demo deck** and open slide 3 (2,000 objects).
2. Open dev tools (Ctrl+Shift+I), then Rendering > Frame Rendering Stats.
3. Pan, zoom, and present through the saved views.
4. For mobile, run `app.emulateMobile(true)` in the console and repeat.
