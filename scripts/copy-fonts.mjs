import { cpSync, readdirSync, readFileSync } from "node:fs";

const src = "node_modules/@excalidraw/excalidraw/dist/prod/fonts";
// Xiaolai is the 13 MB Chinese/Japanese/Korean set; Assistant is only the Excalidraw menu font.
const skip = ["Xiaolai", "Assistant"];

function families() {
	return readdirSync(src).filter((f) => !skip.includes(f));
}

/** Copies the canvas fonts Excalidraw loads into `dest` (`dest/<Family>/*.woff2`). */
export function copyFonts(dest) {
	for (const family of families()) cpSync(`${src}/${family}`, `${dest}/${family}`, { recursive: true });
}

/** The same fonts as `<Family>/<file>` -> base64, for bundling into main.js. */
export function fontsBase64() {
	const out = {};
	for (const family of families()) {
		for (const file of readdirSync(`${src}/${family}`)) out[`${family}/${file}`] = readFileSync(`${src}/${family}/${file}`).toString("base64");
	}
	return out;
}
