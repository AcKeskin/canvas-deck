import { describe, expect, test } from "vitest";
import { allowWebEmbed, isLiveWebLink, isWebLink, webEmbedSrc } from "../src/canvas/web-embeds";

describe("web links", () => {
	test("only http and https", () => {
		expect(isWebLink("https://example.com")).toBe(true);
		expect(isWebLink("http://example.com/a?b=1")).toBe(true);
		expect(isWebLink("obsidian-note:a.md")).toBe(false);
		expect(isWebLink("#cdeck:abc")).toBe(false);
		expect(isWebLink("javascript:alert(1)")).toBe(false);
		expect(isWebLink("example.com")).toBe(false);
		expect(isWebLink(null)).toBe(false);
		expect(isWebLink(undefined)).toBe(false);
	});
});

describe("live web links", () => {
	test("only links allowed first", () => {
		expect(isLiveWebLink("https://live.example.com")).toBe(false);
		allowWebEmbed("https://live.example.com");
		expect(isLiveWebLink("https://live.example.com")).toBe(true);
		allowWebEmbed("javascript:alert(1)");
		expect(isLiveWebLink("javascript:alert(1)")).toBe(false);
	});
});

describe("web embed src", () => {
	test("youtube links become embed pages", () => {
		const embed = "https://www.youtube.com/embed/dQw4w9WgXcQ";
		expect(webEmbedSrc("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(embed);
		expect(webEmbedSrc("https://m.youtube.com/watch?v=dQw4w9WgXcQ&list=x")).toBe(embed);
		expect(webEmbedSrc("https://youtu.be/dQw4w9WgXcQ")).toBe(embed);
		expect(webEmbedSrc("https://youtube.com/shorts/dQw4w9WgXcQ")).toBe(embed);
		expect(webEmbedSrc(embed)).toBe(embed);
	});

	test("youtube start time is kept", () => {
		expect(webEmbedSrc("https://youtu.be/abc?t=42")).toBe("https://www.youtube.com/embed/abc?start=42");
		expect(webEmbedSrc("https://www.youtube.com/watch?v=abc&t=42s")).toBe("https://www.youtube.com/embed/abc?start=42");
		expect(webEmbedSrc("https://www.youtube.com/watch?v=abc&t=1m30s")).toBe("https://www.youtube.com/embed/abc?start=90");
	});

	test("vimeo and codepen", () => {
		expect(webEmbedSrc("https://vimeo.com/76979871")).toBe("https://player.vimeo.com/video/76979871");
		expect(webEmbedSrc("https://codepen.io/someone/pen/abcXYZ")).toBe("https://codepen.io/someone/embed/abcXYZ?default-tab=result");
	});

	test("other links stay as they are", () => {
		expect(webEmbedSrc("https://example.com/page?x=1")).toBe("https://example.com/page?x=1");
		expect(webEmbedSrc("https://www.youtube.com/feed")).toBe("https://www.youtube.com/feed");
		expect(webEmbedSrc("https://vimeo.com/channels/staff")).toBe("https://vimeo.com/channels/staff");
		expect(webEmbedSrc("not a url")).toBe("not a url");
	});
});
