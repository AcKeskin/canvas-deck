import { Modal, Setting, type App } from "obsidian";
import type { CodeEditor } from "../canvas/engine";

/** Edits code card HTML in a modal. */
export function modalCodeEditor(app: App): CodeEditor {
	return { edit: (source) => new Promise((resolve) => new CodeModal(app, source, resolve).open()) };
}

class CodeModal extends Modal {
	private result: string | null = null;

	constructor(
		app: App,
		private source: string,
		private done: (source: string | null) => void,
	) {
		super(app);
	}

	onOpen() {
		this.setTitle("Edit code card");
		this.modalEl.addClass("canvas-deck-code-modal");
		const area = this.contentEl.createEl("textarea", { cls: "canvas-deck-code-editor" });
		area.value = this.source;
		area.spellcheck = false;
		// Tab indents instead of moving focus out of the box.
		area.addEventListener("keydown", (e) => {
			if (e.key !== "Tab") return;
			e.preventDefault();
			area.setRangeText("\t", area.selectionStart, area.selectionEnd, "end");
		});
		new Setting(this.contentEl)
			.addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()))
			.addButton((b) =>
				b
					.setButtonText("Save")
					.setCta()
					.onClick(() => {
						this.result = area.value;
						this.close();
					}),
			);
		area.focus();
	}

	onClose() {
		this.contentEl.empty();
		this.done(this.result);
	}
}
