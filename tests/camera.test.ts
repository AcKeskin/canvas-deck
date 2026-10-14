import { describe, expect, test } from "vitest";
import {
	addView,
	cameraForBounds,
	CameraController,
	lerpCamera,
	moveView,
	removeView,
	visibleBounds,
	type CameraHost,
	type Clock,
} from "../src/canvas/camera";
import { createSlide, type Bounds } from "../src/canvas/slide-data";

const vp = { width: 1600, height: 900 };

function fakeHost(): CameraHost & { state: any } {
	const state: any = { scrollX: 0, scrollY: 0, zoom: { value: 1 }, ...vp, viewModeEnabled: false };
	return {
		state,
		getAppState: () => state,
		updateScene: ({ appState }) => Object.assign(state, appState),
	};
}

function fakeClock(step = 16): Clock & { run(): void } {
	let t = 0;
	let queue: (() => void)[] = [];
	return {
		now: () => t,
		frame: (cb) => queue.push(cb),
		run() {
			while (queue.length) {
				t += step;
				const q = queue;
				queue = [];
				q.forEach((cb) => cb());
			}
		},
	};
}

const near = (a: Bounds, b: Bounds) => {
	for (const k of ["x", "y", "width", "height"] as const) expect(a[k]).toBeCloseTo(b[k], 6);
};

describe("camera math", () => {
	test("bounds with viewport aspect are shown exactly", () => {
		const b = { x: 3000, y: -500, width: 800, height: 450 };
		near(visibleBounds(cameraForBounds(b, vp), vp), b);
	});

	test("other aspect fits inside and stays centered", () => {
		const b = { x: 0, y: 0, width: 100, height: 100 };
		const v = visibleBounds(cameraForBounds(b, vp), vp);
		expect(v.height).toBeCloseTo(100);
		expect(v.x + v.width / 2).toBeCloseTo(50);
	});

	test("lerp ends exactly at target", () => {
		const a = cameraForBounds({ x: 0, y: 0, width: 1600, height: 900 }, vp);
		const b = cameraForBounds({ x: 500, y: 500, width: 160, height: 90 }, vp);
		expect(lerpCamera(a, b, 1, vp)).toEqual(b);
		expect(lerpCamera(a, b, 0, vp).zoom).toBeCloseTo(a.zoom);
	});
});

describe("camera controller", () => {
	const slide = addView(createSlide(), { id: "b", name: "B", bounds: { x: 3000, y: -500, width: 800, height: 450 } });

	test("go to view animates and lands on exact bounds", async () => {
		const host = fakeHost();
		const clock = fakeClock();
		const cam = new CameraController(host, clock);
		const seen: number[] = [];
		const orig = host.updateScene;
		host.updateScene = (s) => {
			seen.push((s.appState.zoom as any)?.value);
			orig(s);
		};
		const done = cam.goToView(slide, "b", { duration: 300 });
		clock.run();
		await done;
		expect(seen.length).toBeGreaterThan(5);
		near(cam.currentBounds(), slide.views[0].bounds);
	});

	test("home returns to the 16:9 frame", async () => {
		const host = fakeHost();
		const clock = fakeClock();
		const cam = new CameraController(host, clock);
		cam.set({ scrollX: 1234, scrollY: -99, zoom: 3 });
		const done = cam.goToFrame(slide);
		clock.run();
		await done;
		near(cam.currentBounds(), { x: 0, y: 0, width: 1920, height: 1080 });
	});

	test("newer move cancels older one", async () => {
		const host = fakeHost();
		const clock = fakeClock();
		const cam = new CameraController(host, clock);
		const a = cam.goToView(slide, "b");
		const b = cam.goToFrame(slide);
		clock.run();
		await Promise.all([a, b]);
		near(cam.currentBounds(), slide.frame);
	});

	test("unknown view rejects", async () => {
		const cam = new CameraController(fakeHost(), fakeClock());
		await expect(cam.goToView(slide, "nope")).rejects.toThrow();
	});

});

describe("saved views", () => {
	const b = { x: 0, y: 0, width: 1, height: 1 };
	const s = ["a", "b", "c"].reduce((acc, id) => addView(acc, { id, name: id, bounds: b }), createSlide());

	test("reorder", () => {
		expect(moveView(s, 0, 2).views.map((v) => v.id)).toEqual(["b", "c", "a"]);
	});

	test("remove", () => {
		expect(removeView(s, "b").views.map((v) => v.id)).toEqual(["a", "c"]);
	});
});

describe("camera motion picture", () => {
	const slide = addView(createSlide(), { id: "b", name: "B", bounds: { x: 3000, y: -500, width: 800, height: 450 } });

	function fakeMotion(available = true) {
		const log: string[] = [];
		return {
			log,
			begin: () => (log.push("begin"), available),
			frame: () => log.push("frame"),
			end: () => log.push("end"),
		};
	}

	test("animates the picture, sets the real camera once at the end", async () => {
		const host = fakeHost();
		const clock = fakeClock();
		const cam = new CameraController(host, clock);
		const motion = fakeMotion();
		cam.motion = motion;
		let sets = 0;
		const orig = host.updateScene;
		host.updateScene = (s) => (sets++, orig(s));
		const done = cam.goToView(slide, "b", { duration: 300 });
		clock.run();
		await done;
		expect(sets).toBe(1);
		expect(motion.log[0]).toBe("begin");
		expect(motion.log.filter((l) => l === "frame").length).toBeGreaterThan(5);
		expect(motion.log[motion.log.length - 1]).toBe("end");
		near(cam.currentBounds(), slide.views[0].bounds);
	});

	test("falls back to normal animation when no picture is ready", async () => {
		const host = fakeHost();
		const clock = fakeClock();
		const cam = new CameraController(host, clock);
		cam.motion = fakeMotion(false);
		let sets = 0;
		const orig = host.updateScene;
		host.updateScene = (s) => (sets++, orig(s));
		const done = cam.goToFrame(slide, { duration: 300 });
		clock.run();
		await done;
		expect(sets).toBeGreaterThan(5);
	});
});
