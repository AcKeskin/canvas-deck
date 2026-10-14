import { FuzzySuggestModal, MarkdownView, Notice, normalizePath, Plugin, TFile, type App, type WorkspaceLeaf } from "obsidian";
import { isImagePath } from "./canvas/vault-images";
import { DECK_FLAG, serializeDeck } from "./deck/deck-format";
import { linkTargets, type LinkTarget } from "./deck/deck-links";
import { createDeck, type Deck } from "./deck/deck-model";
import { DECK_VIEW, DeckView } from "./deck/deck-view";
import { demoDeck } from "./dev/demo-deck";

export default class CanvasDeckPlugin extends Plugin {
	/** Deck notes the user chose to see as markdown this session. */
	private asMarkdown = new Set<string>();

	async onload() {
		this.registerView(DECK_VIEW, (leaf) => new DeckView(leaf));
		this.addRibbonIcon("presentation", "New canvas deck", () => this.newDeck(createDeck(), "Untitled deck"));

		this.addCommand({ id: "new-deck", name: "New deck", callback: () => this.newDeck(createDeck(), "Untitled deck") });
		this.addCommand({ id: "new-demo-deck", name: "New demo deck", callback: () => this.newDeck(demoDeck(), "Demo deck") });

		this.deckCommand("present", "Present deck from current slide", (v) => v.handle?.present());
		this.deckCommand("present-start", "Present deck from start", (v) => v.handle?.present(0));
		this.deckCommand("home", "Go to start frame", (v) => v.engine && v.engine.camera.goToFrame(v.engine.slide));
		this.deckCommand("save-view", "Save current view", (v) => v.engine?.saveCurrentView(`View ${(v.engine?.slide.views.length ?? 0) + 1}`));
		this.deckCommand("insert-image", "Insert vault image", (v) => {
			new ImagePicker(this.app, (f) => v.engine?.insertImage(f.path)).open();
		});
		this.deckCommand("link-selection", "Link selection to slide or view", (v) => {
			const engine = v.engine;
			if (!engine || !v.deck) return;
			if (!engine.hasSelection()) {
				new Notice("Select something to link first.");
				return;
			}
			new LinkPicker(this.app, linkTargets(v.deck), (link) => engine.linkSelection(link)).open();
		});
		this.deckCommand("open-markdown", "Open deck as markdown", (v) => {
			if (!v.file) return;
			this.asMarkdown.add(v.file.path);
			v.leaf.setViewState({ type: "markdown", state: { file: v.file.path } });
		});

		this.addCommand({
			id: "open-deck",
			name: "Open note as deck",
			checkCallback: (checking) => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!view?.file || !this.isDeck(view.file)) return false;
				if (!checking) {
					this.asMarkdown.delete(view.file.path);
					this.openAsDeck(view.leaf, view.file);
				}
				return true;
			},
		});

		// Deck notes open in the deck view instead of the markdown editor.
		this.registerEvent(
			this.app.workspace.on("file-open", (file) => {
				if (!file || !this.isDeck(file) || this.asMarkdown.has(file.path)) return;
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (view?.file === file) this.openAsDeck(view.leaf, file);
			}),
		);

		this.registerEvent(
			this.app.vault.on("rename", (file, oldPath) => {
				if (!isImagePath(file.path)) return;
				this.app.workspace.getLeavesOfType(DECK_VIEW).forEach((l) => (l.view as DeckView).renameImage(oldPath, file.path));
			}),
		);
	}

	private deckCommand(id: string, name: string, run: (v: DeckView) => void) {
		this.addCommand({
			id,
			name,
			checkCallback: (checking) => {
				const view = this.app.workspace.getActiveViewOfType(DeckView);
				if (!view) return false;
				if (!checking) run(view);
				return true;
			},
		});
	}

	private isDeck(file: TFile): boolean {
		return file.extension === "md" && this.app.metadataCache.getFileCache(file)?.frontmatter?.[DECK_FLAG] !== undefined;
	}

	private openAsDeck(leaf: WorkspaceLeaf, file: TFile) {
		return leaf.setViewState({ type: DECK_VIEW, state: { file: file.path }, active: true });
	}

	private async newDeck(deck: Deck, baseName: string) {
		const folder = this.app.fileManager.getNewFileParent(this.app.workspace.getActiveFile()?.path ?? "");
		let path = normalizePath(`${folder.path}/${baseName}.md`);
		for (let i = 1; this.app.vault.getAbstractFileByPath(path); i++) path = normalizePath(`${folder.path}/${baseName} ${i}.md`);
		const file = await this.app.vault.create(path, serializeDeck(deck));
		await this.openAsDeck(this.app.workspace.getLeaf(true), file);
	}
}

class ImagePicker extends FuzzySuggestModal<TFile> {
	constructor(
		app: App,
		private onPick: (f: TFile) => void,
	) {
		super(app);
		this.setPlaceholder("Pick an image");
	}
	getItems() {
		return this.app.vault.getFiles().filter((f) => isImagePath(f.path));
	}
	getItemText(f: TFile) {
		return f.path;
	}
	onChooseItem(f: TFile) {
		this.onPick(f);
	}
}

class LinkPicker extends FuzzySuggestModal<LinkTarget | null> {
	constructor(
		app: App,
		private targets: LinkTarget[],
		private onPick: (link: string | null) => void,
	) {
		super(app);
		this.setPlaceholder("Link to slide or view");
	}
	getItems() {
		return [...this.targets, null];
	}
	getItemText(t: LinkTarget | null) {
		return t ? t.label : "Remove link";
	}
	onChooseItem(t: LinkTarget | null) {
		this.onPick(t?.link ?? null);
	}
}
