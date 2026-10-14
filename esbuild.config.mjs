import esbuild from "esbuild";
import builtins from "builtin-modules";
import { readFileSync, writeFileSync } from "node:fs";

const prod = process.argv[2] === "production";

// styles.css = Excalidraw stylesheet + ours.
const copyStyles = {
	name: "copy-styles",
	setup(build) {
		build.onEnd(() => {
			const css = readFileSync(`node_modules/@excalidraw/excalidraw/dist/${prod ? "prod" : "dev"}/index.css`, "utf8");
			writeFileSync("styles.css", css + "\n" + readFileSync("src/deck/deck.css", "utf8"));
		});
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
