# canvas-deck

Obsidian plugin for slide decks where each slide is an infinite canvas.

A fully vibe-coded Obsidian plugin I made for myself, built with [contexture](https://github.com/AcKeskin/contexture).

Planning docs: `.claude/visions`, `.claude/specs`, `.claude/plans`.

## Use

- **New deck** or **New demo deck** (command palette, or the ribbon icon) creates a deck note.
- Left: slides. Click to open, double-click to rename, drag or ↑/↓ to reorder.
- Middle: the canvas. The dashed box is the start frame. Draw anywhere past it.
- Top: the aspect menu sets the frame to 16:9, 4:3, 1:1, 9:16 or Free. **Edit frame** lets you drag the frame to move it and drag a corner to resize it.
- Top: **+ Save view** saves what you see as a step. Click a view to fly to it.
- Bottom: speaker notes. They are plain text in the note, so search finds them. After clicking a view, the box edits that view's notes instead; click **Frame** to go back to the slide notes.
- **Save slide as template** and **New slide from template** (command palette) keep slides in a template folder, set in the plugin settings.
- **▶ Present**: → / Space next, ← back, Home start frame, N notes (the current view's notes if it has some), Esc exit. Drag and scroll to move freely.
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
