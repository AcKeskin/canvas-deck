import { normalizePath, type App } from "obsidian";

declare global {
	interface Window {
		/** Base URL Excalidraw loads fonts from: `<base>/fonts/<Family>/<file>.woff2`. */
		EXCALIDRAW_ASSET_PATH?: string | string[];
	}
}

/**
 * Points Excalidraw at the fonts in the plugin folder so text draws offline.
 * The CDN stays as a fallback. Call before any canvas opens.
 */
export function useLocalFonts(app: App, pluginDir: string) {
	// The URL may end in "?<mtime>"; drop it so font paths resolve under the folder.
	const url = app.vault.adapter.getResourcePath(normalizePath(pluginDir)).replace(/\?.*$/, "");
	window.EXCALIDRAW_ASSET_PATH = url.replace(/\/*$/, "/");
}

/**
 * Writes bundled font files (`<Family>/<file>` -> base64) missing from `<pluginDir>/fonts`.
 * Store installs ship without the fonts folder; manual installs already have it and write nothing.
 */
export async function installFonts(app: App, pluginDir: string, files: Record<string, string>) {
	const adapter = app.vault.adapter;
	for (const [rel, base64] of Object.entries(files)) {
		const path = normalizePath(`${pluginDir}/fonts/${rel}`);
		if (await adapter.exists(path)) continue;
		const dir = path.slice(0, path.lastIndexOf("/"));
		if (!(await adapter.exists(dir))) await adapter.mkdir(dir);
		await adapter.writeBinary(path, base64ToBytes(base64));
	}
}

function base64ToBytes(base64: string): ArrayBuffer {
	const bin = atob(base64);
	const bytes = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
	return bytes.buffer;
}
