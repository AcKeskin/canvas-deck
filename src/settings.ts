import { PluginSettingTab, Setting, type App, type Plugin, type SettingDefinitionItem } from "obsidian";

export interface CanvasDeckSettings {
	/** Vault folder for slide templates, one deck note per template. */
	templateFolder: string;
}

export const DEFAULT_SETTINGS: CanvasDeckSettings = {
	templateFolder: "Canvas Deck Templates",
};

const TEMPLATE_FOLDER = {
	name: "Template folder",
	desc: "Where slide templates are saved. Each template is a deck note with one slide.",
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

	/** Obsidian 1.13+: declarative settings, so they show up in settings search. */
	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				...TEMPLATE_FOLDER,
				control: { type: "text", key: "templateFolder", placeholder: DEFAULT_SETTINGS.templateFolder },
			},
		];
	}

	getControlValue(key: string): unknown {
		return this.settings[key as keyof CanvasDeckSettings];
	}

	async setControlValue(key: string, value: unknown) {
		if (key === "templateFolder") this.setFolder(String(value));
		await this.save();
	}

	/** Fallback for Obsidian before 1.13. */
	display() {
		this.containerEl.empty();
		new Setting(this.containerEl)
			.setName(TEMPLATE_FOLDER.name)
			.setDesc(TEMPLATE_FOLDER.desc)
			.addText((t) =>
				t
					.setPlaceholder(DEFAULT_SETTINGS.templateFolder)
					.setValue(this.settings.templateFolder)
					.onChange(async (v) => {
						this.setFolder(v);
						await this.save();
					}),
			);
	}

	private setFolder(v: string) {
		this.settings.templateFolder = v.trim() || DEFAULT_SETTINGS.templateFolder;
	}
}
