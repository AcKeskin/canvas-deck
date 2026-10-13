# canvas-deck

Obsidian plugin for slide decks where each slide is an infinite canvas.

Planning docs: `.claude/visions`, `.claude/specs`, `.claude/plans`.

## Dev

- `npm run build` builds `main.js` and `styles.css`. Copy them with `manifest.json` into `<vault>/.obsidian/plugins/canvas-deck/`.
- `npm test` runs unit tests.
- `npm run test:e2e` runs browser tests on a test page (`npm run harness` to open it).

## Checking speed in Obsidian

1. Run the command "New 2,000-object test slide".
2. Open dev tools (Ctrl+Shift+I), then Rendering > Frame Rendering Stats.
3. Pan and zoom, and read the fps.
4. For mobile, run `app.emulateMobile(true)` in the console and repeat.
