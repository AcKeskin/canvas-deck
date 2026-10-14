import { FuzzySuggestModal, normalizePath, TFile, type App } from "obsidian";
import { parseDeck, serializeDeck } from "./deck/deck-format";
import type { DeckSlide } from "./deck/deck-model";

/** Saves the slide as a one-slide deck note in the template folder. Returns the new file. */
export async function saveTemplate(app: App, folder: string, slide: DeckSlide): Promise<TFile> {
	const dir = normalizePath(folder);
	if (!app.vault.getAbstractFileByPath(dir)) await app.vault.createFolder(dir);
	const base = (slide.title || "Template").replace(/[\\/:*?"<>|#^[\]]/g, " ").trim() || "Template";
	let path = normalizePath(`${dir}/${base}.md`);
	for (let i = 1; app.vault.getAbstractFileByPath(path); i++) path = normalizePath(`${dir}/${base} ${i}.md`);
	return app.vault.create(path, serializeDeck({ frontmatter: [], slides: [slide] }));
}

/** First slide of a template note. */
export async function loadTemplate(app: App, file: TFile): Promise<DeckSlide> {
	return parseDeck(await app.vault.read(file)).slides[0];
}

export function templateFiles(app: App, folder: string): TFile[] {
	const prefix = `${normalizePath(folder)}/`;
	return app.vault.getMarkdownFiles().filter((f) => f.path.startsWith(prefix));
}

export class TemplatePicker extends FuzzySuggestModal<TFile> {
	constructor(
		app: App,
		private files: TFile[],
		private onPick: (f: TFile) => void,
	) {
		super(app);
		this.setPlaceholder("Pick a slide template");
	}
	getItems() {
		return this.files;
	}
	getItemText(f: TFile) {
		return f.basename;
	}
	onChooseItem(f: TFile) {
		this.onPick(f);
	}
}
