import esbuild from "esbuild";
import builtins from "builtin-modules";
import { readFileSync, writeFileSync } from "node:fs";
import { copyFonts, fontsBase64 } from "./scripts/copy-fonts.mjs";

const prod = process.argv[2] === "production";

// styles.css = Excalidraw stylesheet + ours. fonts/ = canvas fonts, so text works offline.
const copyStyles = {
	name: "copy-styles",
	setup(build) {
		build.onEnd(() => {
			const css = readFileSync(`node_modules/@excalidraw/excalidraw/dist/${prod ? "prod" : "dev"}/index.css`, "utf8");
			writeFileSync("styles.css", css + "\n" + readFileSync("src/deck/deck.css", "utf8"));
			copyFonts("fonts");
		});
	},
};

// Store installs get only main.js, manifest.json and styles.css, so main.js carries the fonts too.
const bundleFonts = {
	name: "bundle-fonts",
	setup(build) {
		build.onResolve({ filter: /^virtual:fonts$/ }, () => ({ path: "fonts", namespace: "virtual" }));
		build.onLoad({ filter: /.*/, namespace: "virtual" }, () => ({ contents: `export const FONTS = ${JSON.stringify(fontsBase64())};`, loader: "js" }));
	},
};

const ctx = await esbuild.context({
	entryPoints: ["src/main.ts"],
	bundle: true,
	external: ["obsidian", "electron", "@codemirror/*", "@lezer/*", ...builtins],
	format: "cjs",
	target: "es2020",
	logLevel: "info",
	sourcemap: prod ? false : "inline",
	treeShaking: true,
	minify: prod,
	define: { "process.env.NODE_ENV": prod ? '"production"' : '"development"' },
	conditions: [prod ? "production" : "development"],
	outfile: "main.js",
	plugins: [copyStyles, bundleFonts],
});

if (prod) {
	await ctx.rebuild();
	process.exit(0);
} else {
	await ctx.watch();
}
