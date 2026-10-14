import { Component, MarkdownRenderer, type App } from "obsidian";
import type { NoteRenderer } from "../canvas/engine";

/** Renders vault notes read-only and redraws them when they change. Opens them in a new tab. */
export function vaultNoteRenderer(app: App, sourcePath: () => string | undefined): NoteRenderer {
	return {
		render(path, el) {
			let comp = new Component();
			let run = 0;
			const draw = async () => {
				const mine = ++run;
				const file = app.vault.getFileByPath(path);
				const text = file ? await app.vault.cachedRead(file) : null;
				// A newer draw or the cleanup came first.
				if (mine !== run) return;
				comp.unload();
				comp = new Component();
				comp.load();
				el.empty();
				if (text === null) el.setText(`Note not found: ${path}`);
				else await MarkdownRenderer.render(app, text, el, path, comp);
			};
			const ref = app.vault.on("modify", (f) => {
				if (f.path === path) draw();
			});
			draw();
			return () => {
				run++;
				app.vault.offref(ref);
				comp.unload();
			};
		},
		open(path) {
			app.workspace.openLinkText(path, sourcePath() ?? "", "tab");
		},
	};
}
