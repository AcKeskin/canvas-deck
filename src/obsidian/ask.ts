import { Modal, Setting, type App } from "obsidian";

/** Asks for one line of text. Resolves null when closed without saving. */
export function ask(app: App, label: string, value: string): Promise<string | null> {
	return new Promise((resolve) => new AskModal(app, label, value, resolve).open());
}

class AskModal extends Modal {
	private done = false;

	constructor(
		app: App,
		private label: string,
		private value: string,
		private resolve: (value: string | null) => void,
	) {
		super(app);
	}

	onOpen() {
		const submit = () => {
			this.done = true;
			this.resolve(this.value);
			this.close();
		};
		new Setting(this.contentEl).setName(this.label).addText((t) => {
			t.setValue(this.value).onChange((v) => (this.value = v));
			t.inputEl.addEventListener("keydown", (e) => {
				if (e.key === "Enter") submit();
			});
			window.setTimeout(() => t.inputEl.select());
		});
		new Setting(this.contentEl).addButton((b) => b.setButtonText("Save").setCta().onClick(submit));
	}

	onClose() {
		this.contentEl.empty();
		if (!this.done) this.resolve(null);
	}
}
