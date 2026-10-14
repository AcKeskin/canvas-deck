import type { HtmlPage, Overlay } from "./html-plan";

/** Makes text safe inside HTML text and quoted attributes. */
export function escapeHtml(s: string): string {
	return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/**
 * One standalone HTML file that presents the deck.
 * `pictures` holds an image URL per page; `notes` holds rendered note HTML by vault path.
 */
export function buildDeckHtml(title: string, slides: number, pages: HtmlPage[], pictures: string[], notes: Map<string, string>): string {
	const sections = pages.map((p, i) => pageHtml(p, pictures[i], notes)).join("\n");
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${CSS}</style>
</head>
<body data-slides="${slides}">
${sections}
<div class="bar"></div>
<script>${PLAYER}</script>
</body>
</html>
`;
}

function pageHtml(p: HtmlPage, picture: string, notes: Map<string, string>): string {
	const ratio = p.bounds.width / p.bounds.height;
	const alt = p.view === null ? p.title : `${p.title}: ${p.view}`;
	const view = p.view === null ? "" : ` data-view="${escapeHtml(p.view)}"`;
	return `<section class="page" data-slide="${p.slide}"${view} hidden style="--r: ${ratio}">
<div class="box"><img src="${escapeHtml(picture)}" alt="${escapeHtml(alt)}">${p.overlays.map((o) => overlayHtml(o, notes)).join("")}</div>
${p.notes ? `<div class="notes">${escapeHtml(p.notes)}</div>\n` : ""}</section>`;
}

function overlayHtml(o: Overlay, notes: Map<string, string>): string {
	const style = `style="left: ${o.left}%; top: ${o.top}%; width: ${o.width}%; height: ${o.height}%"`;
	// iframes get their src when their page shows, so hidden pages load nothing.
	if (o.kind === "note") return `<div class="embed note" ${style}>${notes.get(o.path) ?? ""}</div>`;
	if (o.kind === "web") return `<iframe class="embed" ${style} data-src="${escapeHtml(o.src)}" allowfullscreen></iframe>`;
	return `<iframe class="embed" ${style} sandbox="allow-scripts" data-srcdoc="${escapeHtml(o.source)}"></iframe>`;
}

const CSS = `
html, body { margin: 0; height: 100%; background: #fff; overflow: hidden; font-family: sans-serif; }
.page { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.page[hidden] { display: none; }
.box { position: relative; overflow: hidden; width: min(100vw, calc(100vh * var(--r))); height: min(100vh, calc(100vw / var(--r))); }
.box img { display: block; width: 100%; height: 100%; }
.embed { position: absolute; box-sizing: border-box; border: 0; background: #fff; }
.note { overflow: auto; padding: 8px 16px; color: #222; }
.notes { display: none; position: absolute; left: 16px; bottom: 16px; max-width: 40%; max-height: 40%; overflow: auto; white-space: pre-wrap; padding: 12px; border-radius: 8px; background: #f4f4f4; font-size: 14px; }
body.show-notes .notes { display: block; }
.bar { position: fixed; right: 12px; bottom: 8px; font-size: 12px; color: #888; pointer-events: none; }
`;

/** Present mode for the exported file: keys, click halves, counter. Plain JS, runs as is. */
export const PLAYER = `
(function () {
	var pages = Array.prototype.slice.call(document.querySelectorAll(".page"));
	var bar = document.querySelector(".bar");
	var at = 0;

	function frames(page, on) {
		page.querySelectorAll("iframe").forEach(function (f) {
			if (!on) {
				f.removeAttribute("srcdoc");
				f.src = "about:blank";
			} else if (f.hasAttribute("data-srcdoc")) f.srcdoc = f.getAttribute("data-srcdoc");
			else f.src = f.getAttribute("data-src");
		});
	}

	function show(i) {
		if (i < 0 || i >= pages.length) return;
		pages[at].hidden = true;
		frames(pages[at], false);
		at = i;
		var p = pages[at];
		p.hidden = false;
		frames(p, true);
		var view = p.getAttribute("data-view");
		bar.textContent = Number(p.getAttribute("data-slide")) + 1 + " / " + document.body.getAttribute("data-slides") + (view === null ? "" : " \u00b7 " + view);
	}

	function slideStart() {
		var slide = pages[at].getAttribute("data-slide");
		for (var i = 0; i < pages.length; i++) if (pages[i].getAttribute("data-slide") === slide) return i;
		return at;
	}

	document.addEventListener("keydown", function (e) {
		if (e.ctrlKey || e.metaKey || e.altKey) return;
		var k = e.key;
		if (["ArrowRight", "ArrowDown", " ", "PageDown", "Enter"].indexOf(k) >= 0) show(at + 1);
		else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].indexOf(k) >= 0) show(at - 1);
		else if (k === "Home") show(slideStart());
		else if (k === "n" || k === "N") document.body.classList.toggle("show-notes");
		else if (k === "f" || k === "F") {
			if (document.fullscreenElement) document.exitFullscreen();
			else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
		} else return;
		e.preventDefault();
	});

	// Click or tap: right half steps on, left half steps back.
	document.addEventListener("click", function (e) {
		// Vault links have no target outside Obsidian.
		if (e.target.closest("a.internal-link")) e.preventDefault();
		if (e.target.closest(".embed, .notes")) return;
		show(e.clientX < window.innerWidth / 2 ? at - 1 : at + 1);
	});

	if (pages.length) show(0);
})();
`;
