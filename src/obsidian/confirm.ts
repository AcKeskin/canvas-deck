import { Modal, Setting, type App } from "obsidian";

/** Asks before deleting something. Resolves true only when the user clicks Delete. */
export function confirm(app: App, message: string): Promise<boolean> {
	return new Promise((resolve) => new ConfirmModal(app, message, resolve).open());
}

class ConfirmModal extends Modal {
	private confirmed = false;

	constructor(
		app: App,
		private message: string,
		private resolve: (confirmed: boolean) => void,
	) {
		super(app);
	}

	onOpen() {
		new Setting(this.contentEl).setName(this.message);
		new Setting(this.contentEl)
			.addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()))
			.addButton((b) =>
				b
					.setButtonText("Delete")
					.setWarning()
					.onClick(() => {
						this.confirmed = true;
						this.close();
					}),
			);
	}

	onClose() {
		this.contentEl.empty();
		this.resolve(this.confirmed);
	}
}
