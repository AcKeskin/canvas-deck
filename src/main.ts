import { FuzzySuggestModal, normalizePath, Plugin, type App, type TFile } from "obsidian";
import { SLIDE_EXTENSION, SlideView, VIEW_TYPE } from "./canvas/canvas-view";
import { createSlide, serializeSlide } from "./canvas/slide-data";
import { isImagePath } from "./canvas/vault-images";

export default class CanvasDeckPlugin extends Plugin {
	async onload() {
		this.registerView(VIEW_TYPE, (leaf) => new SlideView(leaf));
		this.registerExtensions([SLIDE_EXTENSION], VIEW_TYPE);

		this.addCommand({
			id: "new-slide",
			name: "New canvas slide",
			callback: () => this.newSlide(),
		});

		this.addCommand({
			id: "insert-image",
			name: "Insert vault image",
			checkCallback: (checking) => {
				const view = this.activeView();
				if (!view?.engine) return false;
				if (!checking) new ImagePicker(this.app, (f) => view.engine?.insertImage(f.path)).open();
				return true;
			},
		});

		this.addCommand({
			id: "home",
			name: "Go to start frame",
			checkCallback: (checking) => {
				const engine = this.activeView()?.engine;
				if (!engine) return false;
				if (!checking) engine.camera.goToFrame(engine.slide);
				return true;
			},
		});

		this.addCommand({
			id: "save-view",
			name: "Save current view",
			checkCallback: (checking) => {
				const engine = this.activeView()?.engine;
				if (!engine) return false;
				if (!checking) engine.saveCurrentView(`View ${engine.slide.views.length + 1}`);
				return true;
			},
		});

		this.addCommand({
			id: "next-view",
			name: "Go to next saved view",
			checkCallback: (checking) => {
				const view = this.activeView();
				const engine = view?.engine;
				if (!engine || !engine.slide.views.length) return false;
				if (!checking) {
					const views = engine.slide.views;
					view.viewIndex = (view.viewIndex + 1) % views.length;
					engine.camera.goToView(engine.slide, views[view.viewIndex].id);
				}
				return true;
			},
		});

		this.registerEvent(
			this.app.vault.on("rename", (file, oldPath) => {
				if (!isImagePath(file.path)) return;
				this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((leaf) => {
					(leaf.view as SlideView).engine?.renameImage(oldPath, file.path);
				});
			}),
		);
	}

	private activeView(): SlideView | null {
		return this.app.workspace.getActiveViewOfType(SlideView);
	}

	private async newSlide() {
		const folder = this.app.fileManager.getNewFileParent(this.app.workspace.getActiveFile()?.path ?? "");
		let path = normalizePath(`${folder.path}/Untitled slide.${SLIDE_EXTENSION}`);
		for (let i = 1; this.app.vault.getAbstractFileByPath(path); i++) {
			path = normalizePath(`${folder.path}/Untitled slide ${i}.${SLIDE_EXTENSION}`);
		}
		const file = await this.app.vault.create(path, serializeSlide(createSlide()));
		await this.app.workspace.getLeaf(true).openFile(file);
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
