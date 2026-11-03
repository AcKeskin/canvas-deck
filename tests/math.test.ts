import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { describe, expect, test } from "vitest";
import { mathFiles, mathLatex, renderMath } from "../src/canvas/math";

const img = (fileId: string, latex?: unknown) => ({ id: fileId, type: "image", fileId, customData: latex === undefined ? undefined : { latex } }) as unknown as ExcalidrawElement;
const svgOf = (dataURL: string) => Buffer.from(dataURL.split(",")[1], "base64").toString();

describe("math", () => {
	test("renders LaTeX to a sized SVG in dark ink", () => {
		const m = renderMath("\\frac{a}{b}");
		expect(m.dataURL.startsWith("data:image/svg+xml;base64,")).toBe(true);
		const svg = svgOf(m.dataURL);
		expect(svg).toContain(`width="${m.width}"`);
		expect(svg).not.toContain("currentColor");
		expect(m.height).toBeGreaterThan(40);
	});

	test("same LaTeX, same file id; different LaTeX, different id", () => {
		expect(renderMath("x").id).toBe(renderMath("x").id);
		expect(renderMath("x").id).not.toBe(renderMath("y").id);
	});

	test("bad LaTeX throws", () => {
		expect(() => renderMath("\\frac{a")).toThrow();
		expect(() => renderMath("\\nosuchmacro")).toThrow();
	});

	test("only images with string latex are equations", () => {
		expect(mathLatex(img("a", "x"))).toBe("x");
		expect(mathLatex(img("a"))).toBeNull();
		expect(mathLatex(img("a", 3))).toBeNull();
		expect(mathLatex({ ...img("a", "x"), type: "rectangle" } as ExcalidrawElement)).toBeNull();
	});

	test("files for equations only; bad LaTeX skipped", () => {
		const files = mathFiles([img("a", "x^2"), img("b"), img("c", "\\frac{")]);
		expect(Object.keys(files)).toEqual(["a"]);
		expect(files["a" as never].mimeType).toBe("image/svg+xml");
	});
});
