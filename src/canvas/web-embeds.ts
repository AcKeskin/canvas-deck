/** True for http and https links. Web embeds keep the URL as typed in the element link. */
export function isWebLink(link: string | null | undefined): link is string {
	const url = parse(link);
	return url?.protocol === "http:" || url?.protocol === "https:";
}

/**
 * The iframe src for a web link. Video and pen pages refuse to load in a frame,
 * so YouTube, Vimeo and CodePen links become their embed pages. Other links stay as they are.
 */
export function webEmbedSrc(link: string): string {
	const url = parse(link);
	if (!url) return link;
	const host = url.hostname.replace(/^(www\.|m\.)/, "");
	const path = url.pathname.split("/").filter(Boolean);

	if (host === "youtube.com" || host === "youtu.be") {
		const id = host === "youtu.be" ? path[0] : path[0] === "watch" ? url.searchParams.get("v") : ["shorts", "embed", "live"].includes(path[0]) ? path[1] : null;
		if (!id) return link;
		const start = seconds(url.searchParams.get("t") ?? url.searchParams.get("start"));
		return `https://www.youtube.com/embed/${id}${start ? `?start=${start}` : ""}`;
	}
	if (host === "vimeo.com" && /^\d+$/.test(path[0] ?? "")) return `https://player.vimeo.com/video/${path[0]}`;
	if (host === "codepen.io" && path[1] === "pen" && path[2]) return `https://codepen.io/${path[0]}/embed/${path[2]}?default-tab=result`;
	return link;
}

function parse(link: string | null | undefined): URL | null {
	try {
		return link ? new URL(link.trim()) : null;
	} catch {
		return null;
	}
}

/** YouTube start time: `90`, `90s` or `1h2m3s`. */
function seconds(t: string | null): number {
	const m = t?.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);
	if (!m) return 0;
	return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}
