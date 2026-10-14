import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { copyFonts } from "./scripts/copy-fonts.mjs";

export default defineConfig({
	root: "dev/harness",
	// The harness serves the fonts itself, like the plugin does in Obsidian.
	plugins: [react(), { name: "copy-fonts", buildStart: () => copyFonts("dev/harness/public/fonts") }],
	define: { "process.env.IS_PREACT": JSON.stringify("false") },
	server: { port: 5199, strictPort: true },
	build: { outDir: "../dist" },
});
