import esbuild from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";
import { builtinModules } from "node:module";
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

// React DOM can add <script> tags for script resources. The plugin never renders those; make them inert.
const noScriptTags = {
	name: "no-script-tags",
	setup(build) {
		build.onLoad({ filter: /react-dom-client\.(production|development)\.js$/ }, (args) => ({
			contents: readFileSync(args.path, "utf8").replaceAll('createElement("script")', 'createElement("noscript")'),
			loader: "js",
		}));
	},
};

const ctx = await esbuild.context({
	entryPoints: ["src/main.ts"],
	bundle: true,
	external: ["obsidian", "electron", "@codemirror/*", "@lezer/*", ...builtinModules, ...builtinModules.map((m) => `node:${m}`)],
	format: "cjs",
	target: "es2020",
	logLevel: "info",
	sourcemap: prod ? false : "inline",
	treeShaking: true,
	minify: prod,
	define: { "process.env.NODE_ENV": prod ? '"production"' : '"development"' },
	conditions: [prod ? "production" : "development"],
	outfile: "main.js",
	plugins: [copyStyles, bundleFonts, noScriptTags],
});

if (prod) {
	await ctx.rebuild();
	process.exit(0);
} else {
	await ctx.watch();
}
