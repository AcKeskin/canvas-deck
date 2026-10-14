import { cpSync, readdirSync } from "node:fs";

const src = "node_modules/@excalidraw/excalidraw/dist/prod/fonts";
// Xiaolai is the 13 MB Chinese/Japanese/Korean set; Assistant is only the Excalidraw menu font.
const skip = ["Xiaolai", "Assistant"];

/** Copies the canvas fonts Excalidraw loads into `dest` (`dest/<Family>/*.woff2`). */
export function copyFonts(dest) {
	for (const family of readdirSync(src)) {
		if (!skip.includes(family)) cpSync(`${src}/${family}`, `${dest}/${family}`, { recursive: true });
	}
}
