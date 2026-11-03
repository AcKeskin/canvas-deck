import { Modal, Setting, type App } from "obsidian";
import type { CodeEditor } from "../canvas/engine";
import { renderMath } from "../canvas/math";

/** Edits equation LaTeX in a modal with a live preview. Save is off while the LaTeX has errors. */
export function modalMathEditor(app: App): CodeEditor {
	return { edit: (latex) => new Promise((resolve) => new MathModal(app, latex, resolve).open()) };
}

class MathModal extends Modal {
	private result: string | null = null;

	constructor(
		app: App,
		private latex: string,
		private done: (latex: string | null) => void,
	) {
		super(app);
	}

	onOpen() {
		this.setTitle("Equation");
		this.modalEl.addClass("canvas-deck-math-modal");
		const area = this.contentEl.createEl("textarea", { cls: "canvas-deck-math-input", attr: { placeholder: "LaTeX, e.g. e^{i\\pi} + 1 = 0" } });
		area.value = this.latex;
		area.spellcheck = false;
		const preview = this.contentEl.createDiv({ cls: "canvas-deck-math-preview" });
		const error = this.contentEl.createDiv({ cls: "canvas-deck-math-error" });
		let save: HTMLButtonElement | null = null;
		const update = () => {
			const ok = this.draw(area.value, preview, error);
			save?.toggleAttribute("disabled", !ok);
		};
		const submit = () => {
			if (save?.hasAttribute("disabled")) return;
			this.result = area.value;
			this.close();
		};
		area.addEventListener("input", update);
		// Ctrl/Cmd+Enter saves; plain Enter makes a new line for aligned blocks.
		area.addEventListener("keydown", (e) => {
			if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
				e.preventDefault();
				submit();
			}
		});
		new Setting(this.contentEl)
			.addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()))
			.addButton((b) => {
				save = b.buttonEl;
				b.setButtonText("Save").setCta().onClick(submit);
			});
		update();
		area.focus();
	}

	private draw(latex: string, preview: HTMLElement, error: HTMLElement): boolean {
		preview.empty();
		error.setText("");
		if (!latex.trim()) return false;
		try {
			preview.createEl("img", { attr: { src: renderMath(latex).dataURL } });
			return true;
		} catch (e) {
			error.setText((e as Error).message);
			return false;
		}
	}

	onClose() {
		this.contentEl.empty();
		this.done(this.result);
	}
}
