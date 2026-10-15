import { useEffect, useRef, type RefObject } from "react";
import type { Camera } from "../canvas/camera";
import type { CanvasEngine } from "../canvas/engine";
import { INK_COLOR, inkWidth, type Stroke } from "./ink";

export type InkTool = "pen" | "laser";

export interface InkLayerProps {
	engine: RefObject<CanvasEngine | null>;
	tool: InkTool | null;
	strokes: Stroke[];
	onStroke: (s: Stroke) => void;
}

/** Pen width on screen at the time of drawing; it then scales with the camera. */
const PEN_WIDTH = 1.5;
/** How long the laser trail lasts, in ms. */
const TRAIL_MS = 250;
/** Clicks here go to the presenter UI, not the pen. */
const UI = ".canvas-deck-present-bar, .canvas-deck-grid";

/**
 * Canvas on top of the slide for presenter ink and the laser pointer.
 * Takes pointer input from its parent while a tool is on, so Excalidraw doesn't pan.
 */
export function InkLayer({ engine, tool, strokes, onStroke }: InkLayerProps) {
	const canvas = useRef<HTMLCanvasElement>(null);
	const drawing = useRef<Stroke | null>(null);
	const laser = useRef<{ x: number; y: number; t: number }[]>([]);
	const state = useRef({ tool, strokes, onStroke });
	state.current = { tool, strokes, onStroke };

	useEffect(() => {
		const host = canvas.current?.parentElement;
		if (!host || !tool) return;
		const skip = (e: PointerEvent) => (e.target as Element).closest?.(UI);
		const down = (e: PointerEvent) => {
			if (skip(e) || e.button !== 0) return;
			e.stopPropagation();
			e.preventDefault();
			const en = engine.current;
			if (tool === "pen" && en) {
				drawing.current = { points: [], pressures: [], width: PEN_WIDTH / en.camera.camera.zoom };
				add(e);
			}
			if (tool === "laser") trail(e);
		};
		const move = (e: PointerEvent) => {
			if (skip(e) && !drawing.current) return;
			e.stopPropagation();
			for (const c of e.getCoalescedEvents?.() ?? [e]) {
				if (drawing.current) add(c);
				else if (tool === "laser" && (e.pointerType === "mouse" || e.buttons)) trail(c);
			}
		};
		const up = (e: PointerEvent) => {
			if (!drawing.current && skip(e)) return;
			e.stopPropagation();
			const s = drawing.current;
			drawing.current = null;
			if (s?.points.length) state.current.onStroke(s);
			// A finger leaves the screen; a mouse stays where it is.
			if (e.pointerType !== "mouse") laser.current = [];
		};
		const add = (e: PointerEvent) => {
			const p = engine.current?.sceneAt(e.clientX, e.clientY);
			if (!p || !drawing.current) return;
			drawing.current.points.push([p.x, p.y]);
			drawing.current.pressures.push(e.pointerType === "pen" && e.pressure > 0 ? e.pressure : 0.5);
		};
		const trail = (e: PointerEvent) => {
			const r = host.getBoundingClientRect();
			laser.current.push({ x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() });
		};
		const opts = { capture: true };
		host.addEventListener("pointerdown", down, opts);
		host.addEventListener("pointermove", move, opts);
		host.addEventListener("pointerup", up, opts);
		host.addEventListener("pointercancel", up, opts);
		return () => {
			host.removeEventListener("pointerdown", down, opts);
			host.removeEventListener("pointermove", move, opts);
			host.removeEventListener("pointerup", up, opts);
			host.removeEventListener("pointercancel", up, opts);
			drawing.current = null;
			laser.current = [];
		};
	}, [tool, engine]);

	// Redraws every frame while there is something to show, so ink follows the camera.
	useEffect(() => {
		let raf = 0;
		let shown = false;
		const draw = () => {
			raf = window.requestAnimationFrame(draw);
			const c = canvas.current;
			const en = engine.current;
			const { tool, strokes } = state.current;
			const now = performance.now();
			const dots = laser.current;
			while (dots.length > 1 && now - dots[0].t > TRAIL_MS) dots.shift();
			const all = drawing.current ? [...strokes, drawing.current] : strokes;
			const laserOn = tool === "laser" && dots.length > 0;
			if (!c || !en || (!shown && !all.length && !laserOn)) return;
			const ctx = c.getContext("2d")!;
			const dpr = window.devicePixelRatio || 1;
			const w = c.clientWidth;
			const h = c.clientHeight;
			if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
				c.width = Math.round(w * dpr);
				c.height = Math.round(h * dpr);
			}
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			ctx.clearRect(0, 0, w, h);
			const cam = en.camera.camera;
			for (const s of all) drawStroke(ctx, s, cam);
			if (laserOn) drawLaser(ctx, dots, now);
			shown = all.length > 0 || laserOn;
		};
		raf = window.requestAnimationFrame(draw);
		return () => window.cancelAnimationFrame(raf);
	}, [engine]);

	return <canvas ref={canvas} className="canvas-deck-ink" />;
}

function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke, cam: Camera) {
	const at = (i: number) => [(s.points[i][0] + cam.scrollX) * cam.zoom, (s.points[i][1] + cam.scrollY) * cam.zoom];
	ctx.strokeStyle = INK_COLOR;
	ctx.lineCap = "round";
	for (let i = 0; i < s.points.length; i++) {
		const [ax, ay] = at(Math.max(0, i - 1));
		const [bx, by] = at(i);
		ctx.lineWidth = inkWidth(s.width, s.pressures[i]) * cam.zoom;
		ctx.beginPath();
		ctx.moveTo(ax, ay);
		ctx.lineTo(bx, by);
		ctx.stroke();
	}
}

function drawLaser(ctx: CanvasRenderingContext2D, dots: { x: number; y: number; t: number }[], now: number) {
	ctx.strokeStyle = "rgb(255, 40, 40)";
	ctx.lineCap = "round";
	for (let i = 1; i < dots.length; i++) {
		const fade = 1 - (now - dots[i].t) / TRAIL_MS;
		if (fade <= 0) continue;
		ctx.globalAlpha = fade * 0.6;
		ctx.lineWidth = 2 + 6 * fade;
		ctx.beginPath();
		ctx.moveTo(dots[i - 1].x, dots[i - 1].y);
		ctx.lineTo(dots[i].x, dots[i].y);
		ctx.stroke();
	}
	const head = dots[dots.length - 1];
	ctx.globalAlpha = 1;
	ctx.fillStyle = "rgb(255, 40, 40)";
	ctx.shadowColor = "rgba(255, 0, 0, 0.8)";
	ctx.shadowBlur = 12;
	ctx.beginPath();
	ctx.arc(head.x, head.y, 6, 0, Math.PI * 2);
	ctx.fill();
	ctx.shadowBlur = 0;
}
