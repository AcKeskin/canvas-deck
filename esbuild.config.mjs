import esbuild from "esbuild";
import builtins from "builtin-modules";

const prod = process.argv[2] === "production";

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
	loader: { ".woff2": "dataurl" },
	outfile: "main.js",
});

if (prod) {
	await ctx.rebuild();
	process.exit(0);
} else {
	await ctx.watch();
}
