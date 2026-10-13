import { describe, expect, test } from "vitest";
import type { ExcalidrawElement, FileId } from "@excalidraw/excalidraw/element/types";
import { createSlide, type SlideData } from "../src/canvas/slide-data";
import {
	isImagePath,
	mimeOf,
	pathFromDragText,
	pruneImages,
	renameImage,
	unsavedFileIds,
} from "../src/canvas/vault-images";

const img = (id: string, fileId: string, isDeleted = false) =>
	({ id, type: "image", fileId, isDeleted }) as unknown as ExcalidrawElement;

const slide: SlideData = {
	...createSlide(),
	elements: [img("e1", "f1"), img("e2", "f2", true)],
	images: { ["f1" as FileId]: "pics/a.png", ["f2" as FileId]: "pics/b.png" },
};

describe("vault images", () => {
	test("finds files without a vault path", () => {
		expect(unsavedFileIds(slide, ["f1", "f3"])).toEqual(["f3"]);
	});

	test("rename updates matching links only", () => {
		const next = renameImage(slide, "pics/a.png", "art/a.png");
		expect(next.images).toEqual({ f1: "art/a.png", f2: "pics/b.png" });
		expect(renameImage(slide, "nope.png", "x.png")).toBe(slide);
	});

	test("prune drops links of deleted images", () => {
		expect(pruneImages(slide).images).toEqual({ f1: "pics/a.png" });
	});

	test("reads vault path from drag text", () => {
		expect(pathFromDragText("obsidian://open?vault=V&file=pics%2Fa%20b.png")).toBe("pics/a b.png");
		expect(pathFromDragText("![[pics/a.png]]")).toBe("pics/a.png");
		expect(pathFromDragText("[[pics/a.png|alias]]")).toBe("pics/a.png");
		expect(pathFromDragText("hello")).toBeNull();
	});

	test("image types", () => {
		expect(isImagePath("a/B.PNG")).toBe(true);
		expect(isImagePath("a/b.md")).toBe(false);
		expect(mimeOf("x.jpg")).toBe("image/jpeg");
	});
});
