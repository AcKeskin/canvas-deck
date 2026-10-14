import { arrayBufferToBase64, base64ToArrayBuffer, type App } from "obsidian";
import type { ImageStore } from "../canvas/engine";
import { extFromMime, mimeOf } from "../canvas/vault-images";

/** Images live in the vault; pasted ones go to the attachment folder set in Obsidian. */
export function vaultImageStore(app: App, sourcePath: () => string | undefined): ImageStore {
	return {
		load: async (path) => {
			const file = app.vault.getFileByPath(path);
			if (!file) return null;
			return `data:${mimeOf(path)};base64,${arrayBufferToBase64(await app.vault.readBinary(file))}`;
		},
		save: async (dataURL, mimeType) => {
			const name = `Pasted image ${window.moment().format("YYYYMMDDHHmmss")}.${extFromMime(mimeType)}`;
			const path = await app.fileManager.getAvailablePathForAttachment(name, sourcePath());
			const file = await app.vault.createBinary(path, base64ToArrayBuffer(dataURL.split(",")[1]));
			return file.path;
		},
	};
}
