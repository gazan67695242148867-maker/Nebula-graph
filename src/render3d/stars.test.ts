import { describe, expect, it } from "vitest";
import { starPositions } from "./stars";

describe("starPositions", () => {
	it("returns one xyz triple per star", () => {
		expect(starPositions(0)).toHaveLength(0);
		expect(starPositions(1500)).toHaveLength(4500);
	});

	it("keeps every star inside the shell between 1500 and 3200 units", () => {
		const p = starPositions(1500);
		for (let i = 0; i < p.length; i += 3) {
			const r = Math.hypot(p[i] ?? 0, p[i + 1] ?? 0, p[i + 2] ?? 0);
			expect(r).toBeGreaterThanOrEqual(1500 - 1e-3);
			expect(r).toBeLessThanOrEqual(3200 + 1e-3);
		}
	});

	it("is deterministic for the same seed and differs between seeds", () => {
		expect(Array.from(starPositions(50, 7))).toEqual(Array.from(starPositions(50, 7)));
		expect(Array.from(starPositions(50, 7))).not.toEqual(Array.from(starPositions(50, 8)));
	});
});
