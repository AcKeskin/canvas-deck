import { PluginSettingTab, Setting, type App, type Plugin } from "obsidian";

export interface CanvasDeckSettings {
	/** Vault folder for slide templates, one deck note per template. */
	templateFolder: string;
}

export const DEFAULT_SETTINGS: CanvasDeckSettings = {
	templateFolder: "Canvas Deck Templates",
};

export class CanvasDeckSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		plugin: Plugin,
		private settings: CanvasDeckSettings,
		private save: () => Promise<void>,
	) {
		super(app, plugin);
	}

	display() {
		this.containerEl.empty();
		new Setting(this.containerEl)
			.setName("Template folder")
			.setDesc("Where slide templates are saved. Each template is a deck note with one slide.")
			.addText((t) =>
				t
					.setPlaceholder(DEFAULT_SETTINGS.templateFolder)
					.setValue(this.settings.templateFolder)
					.onChange(async (v) => {
						this.settings.templateFolder = v.trim() || DEFAULT_SETTINGS.templateFolder;
						await this.save();
					}),
			);
	}
}
