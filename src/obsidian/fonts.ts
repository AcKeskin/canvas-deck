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
