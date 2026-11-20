import { describe, expect, it } from "vitest";
import { boundingSphere, fibonacciSphere, LAYOUT_SPACING } from "./layout";
import { nodeRadius } from "./style";

describe("fibonacciSphere", () => {
	it("returns one xyz triple per node", () => {
		expect(fibonacciSphere(0)).toHaveLength(0);
		expect(fibonacciSphere(7)).toHaveLength(21);
	});

	it("places every node on a sphere of radius spacing * sqrt(count)", () => {
		for (const count of [1, 2, 200, 10000]) {
			const p = fibonacciSphere(count);
			const expected = LAYOUT_SPACING * Math.sqrt(count);
			for (let i = 0; i < count; i++) {
				const r = Math.hypot(p[i * 3] ?? 0, p[i * 3 + 1] ?? 0, p[i * 3 + 2] ?? 0);
				expect(Math.abs(r - expected)).toBeLessThan(1e-3 * expected);
			}
		}
	});

	it("is centred on the origin and spreads points across the sphere", () => {
		const count = 500;
		const p = fibonacciSphere(count);
		const sphere = boundingSphere(p);
		expect(Math.hypot(sphere.cx, sphere.cy, sphere.cz)).toBeLessThan(1e-2 * sphere.radius);
		// Spread check: both hemispheres must be populated.
		let up = 0;
		for (let i = 0; i < count; i++) if ((p[i * 3 + 1] ?? 0) > 0) up++;
		expect(up).toBeGreaterThan(count * 0.45);
		expect(up).toBeLessThan(count * 0.55);
	});

	it("is deterministic", () => {
		expect(fibonacciSphere(100)).toEqual(fibonacciSphere(100));
	});
});

describe("boundingSphere", () => {
	it("returns the centroid and the farthest distance from it", () => {
		const s = boundingSphere(new Float32Array([-1, 0, 0, 1, 0, 0, 0, 3, 0]));
		expect(s.cx).toBeCloseTo(0);
		expect(s.cy).toBeCloseTo(1);
		expect(s.cz).toBeCloseTo(0);
		// Centroid is (0, 1, 0). The farthest point is (0, 3, 0), 2 units away.
		expect(s.radius).toBeCloseTo(2);
	});

	it("handles empty input", () => {
		expect(boundingSphere(new Float32Array())).toEqual({ cx: 0, cy: 0, cz: 0, radius: 0 });
	});
});

describe("nodeRadius", () => {
	it("follows 1.5 + 1.2 * sqrt(degree)", () => {
		expect(nodeRadius(0)).toBeCloseTo(1.5);
		expect(nodeRadius(4)).toBeCloseTo(1.5 + 1.2 * 2);
	});

	it("caps at 14", () => {
		expect(nodeRadius(10_000)).toBe(14);
	});
});
