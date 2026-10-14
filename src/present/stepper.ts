/** Where the presenter is: a slide and one of its saved views (-1 = start frame). */
export interface Position {
	slide: number;
	view: number;
}

/** View counts per slide, in order. */
export type Shape = readonly number[];

/** Steps through each slide's saved views, then on to the next slide's frame. */
export function next(p: Position, shape: Shape): Position {
	if (p.view < (shape[p.slide] ?? 0) - 1) return { slide: p.slide, view: p.view + 1 };
	if (p.slide < shape.length - 1) return { slide: p.slide + 1, view: -1 };
	return p;
}

export function prev(p: Position, shape: Shape): Position {
	if (p.view > -1) return { slide: p.slide, view: p.view - 1 };
	if (p.slide > 0) return { slide: p.slide - 1, view: -1 };
	return p;
}

export function isEnd(p: Position, shape: Shape): boolean {
	return next(p, shape) === p;
}
