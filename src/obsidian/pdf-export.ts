import { Modal, Notice, Setting, TFile, type App } from "obsidian";
import type { ImageStore } from "../canvas/engine";
import type { Deck } from "../deck/deck-model";
import type { PdfOptions } from "../deck/pdf-plan";
import { renderDeckPdf } from "../deck/pdf-render";

/** Last choices, kept for this session. */
const last: PdfOptions = { views: true, notes: false };

/** Asks which pages to include, then saves `<deck name>.pdf` next to the deck note. */
export function exportDeckPdf(app: App, file: TFile, deck: Deck, images: ImageStore) {
	new PdfModal(app, async (opts) => {
		const notice = new Notice("Canvas Deck: exporting PDF…", 0);
		try {
			const bytes = await renderDeckPdf(deck, images, opts);
			const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
			const path = file.path.replace(/\.md$/, ".pdf");
			const existing = app.vault.getFileByPath(path);
			if (existing) await app.vault.modifyBinary(existing, data);
			else await app.vault.createBinary(path, data);
			new Notice(`Canvas Deck: saved ${path}`);
		} catch (e) {
			new Notice(`Canvas Deck: PDF export failed. ${(e as Error).message}`);
		} finally {
			notice.hide();
		}
	}).open();
}

class PdfModal extends Modal {
	constructor(
		app: App,
		private onExport: (opts: PdfOptions) => Promise<void>,
	) {
		super(app);
	}

	onOpen() {
		this.setTitle("Export deck to PDF");
		new Setting(this.contentEl)
			.setName("Include saved views as pages")
			.addToggle((t) => t.setValue(last.views).onChange((v) => (last.views = v)));
		new Setting(this.contentEl)
			.setName("Include speaker notes")
			.setDesc("Printed under each slide's start frame.")
			.addToggle((t) => t.setValue(last.notes).onChange((v) => (last.notes = v)));
		new Setting(this.contentEl).addButton((b) =>
			b
				.setButtonText("Export")
				.setCta()
				.onClick(() => {
					this.close();
					void this.onExport({ ...last });
				}),
		);
	}

	onClose() {
		this.contentEl.empty();
	}
}
