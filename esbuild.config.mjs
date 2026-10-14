import esbuild from "esbuild";
import builtins from "builtin-modules";
import { copyFileSync } from "node:fs";

const prod = process.argv[2] === "production";

// Excalidraw's stylesheet ships as the plugin's styles.css.
const copyStyles = {
	name: "copy-styles",
	setup(build) {
		build.onEnd(() => copyFileSync(`node_modules/@excalidraw/excalidraw/dist/${prod ? "prod" : "dev"}/index.css`, "styles.css"));
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
	plugins: [copyStyles],
});

if (prod) {
	await ctx.rebuild();
	process.exit(0);
} else {
	await ctx.watch();
}
