/**
 * Milestone 2 placement: nodes on a Fibonacci sphere. Milestone 3 replaces this with
 * worker physics, but the same Float32Array [x, y, z] layout is kept.
 */

/** Radius = SPACING * sqrt(count), which keeps the surface density roughly constant. */
export const LAYOUT_SPACING = 4;

export interface BoundingSphere {
	cx: number;
	cy: number;
	cz: number;
	radius: number;
}

/** Positions as a flat [x, y, z, x, y, z, ...] array, one triple per node. */
export function fibonacciSphere(count: number, spacing: number = LAYOUT_SPACING): Float32Array {
	const out = new Float32Array(count * 3);
	if (count === 0) return out;

	const sphereRadius = spacing * Math.sqrt(count);
	const goldenAngle = Math.PI * (3 - Math.sqrt(5));
	for (let i = 0; i < count; i++) {
		// Sample y at the centre of each of count equal-area bands.
		const y = 1 - ((i + 0.5) * 2) / count;
		const ring = Math.sqrt(Math.max(0, 1 - y * y));
		const theta = goldenAngle * i;
		out[i * 3] = Math.cos(theta) * ring * sphereRadius;
		out[i * 3 + 1] = y * sphereRadius;
		out[i * 3 + 2] = Math.sin(theta) * ring * sphereRadius;
	}
	return out;
}

/** Centroid and radius of the smallest sphere around the centroid that holds every point. */
export function boundingSphere(positions: Float32Array): BoundingSphere {
	const count = positions.length / 3;
	if (count === 0) return { cx: 0, cy: 0, cz: 0, radius: 0 };

	let cx = 0;
	let cy = 0;
	let cz = 0;
	for (let i = 0; i < count; i++) {
		cx += positions[i * 3] ?? 0;
		cy += positions[i * 3 + 1] ?? 0;
		cz += positions[i * 3 + 2] ?? 0;
	}
	cx /= count;
	cy /= count;
	cz /= count;

	let maxSq = 0;
	for (let i = 0; i < count; i++) {
		const dx = (positions[i * 3] ?? 0) - cx;
		const dy = (positions[i * 3 + 1] ?? 0) - cy;
		const dz = (positions[i * 3 + 2] ?? 0) - cz;
		maxSq = Math.max(maxSq, dx * dx + dy * dy + dz * dz);
	}
	return { cx, cy, cz, radius: Math.sqrt(maxSq) };
}
