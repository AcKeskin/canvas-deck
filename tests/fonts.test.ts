import type { App } from "obsidian";
import { describe, expect, test, vi } from "vitest";
import { installFonts } from "../src/obsidian/fonts";

// The obsidian package is types only; installFonts needs just normalizePath.
vi.mock("obsidian", () => ({ normalizePath: (p: string) => p }));

/** In-memory vault adapter. */
function fakeApp(existing: string[] = []) {
	const files = new Map<string, Uint8Array>(existing.map((p) => [p, new Uint8Array()]));
	const dirs = new Set<string>();
	const adapter = {
		exists: async (p: string) => files.has(p) || dirs.has(p),
		mkdir: async (p: string) => void dirs.add(p),
		writeBinary: async (p: string, data: ArrayBuffer) => void files.set(p, new Uint8Array(data)),
	};
	return { app: { vault: { adapter } } as unknown as App, files, dirs };
}

describe("installFonts", () => {
	test("writes missing fonts with their bytes", async () => {
		const { app, files, dirs } = fakeApp();
		await installFonts(app, "plugins/cd", { "Virgil/Virgil.woff2": btoa("abc") });
		expect([...files.get("plugins/cd/fonts/Virgil/Virgil.woff2")!]).toEqual([97, 98, 99]);
		expect(dirs.has("plugins/cd/fonts/Virgil")).toBe(true);
	});

	test("leaves fonts that are already there", async () => {
		const { app, files } = fakeApp(["plugins/cd/fonts/Virgil/Virgil.woff2"]);
		await installFonts(app, "plugins/cd", { "Virgil/Virgil.woff2": btoa("abc") });
		expect(files.get("plugins/cd/fonts/Virgil/Virgil.woff2")!.length).toBe(0);
	});
});
