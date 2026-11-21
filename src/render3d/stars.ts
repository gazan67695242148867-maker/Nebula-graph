import * as THREE from "three";

/** Star shell radii. Inside the far plane (4000) and inside the background sphere (3500). */
const STAR_MIN_RADIUS = 1500;
const STAR_MAX_RADIUS = 3200;

/**
 * Deterministic pseudo-random generator (mulberry32), so the same star field appears every time.
 */
function seededRandom(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * Positions of `count` stars spread evenly over a spherical shell.
 * Returns a flat [x, y, z, ...] array, the same layout as the node positions.
 */
export function starPositions(count: number, seed = 1): Float32Array {
	const random = seededRandom(seed);
	const out = new Float32Array(count * 3);
	for (let i = 0; i < count; i++) {
		// Uniform direction on the sphere: z uniform in [-1, 1], angle uniform in [0, 2π).
		const z = random() * 2 - 1;
		const angle = random() * Math.PI * 2;
		const ring = Math.sqrt(1 - z * z);
		const radius = STAR_MIN_RADIUS + random() * (STAR_MAX_RADIUS - STAR_MIN_RADIUS);
		out[i * 3] = Math.cos(angle) * ring * radius;
		out[i * 3 + 1] = Math.sin(angle) * ring * radius;
		out[i * 3 + 2] = z * radius;
	}
	return out;
}

/** Small, dim, unfogged stars. Used on the dark palette only. */
export function buildStars(count: number): THREE.Points {
	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute("position", new THREE.BufferAttribute(starPositions(count), 3));
	const material = new THREE.PointsMaterial({
		color: 0xffffff,
		size: 1.5,
		sizeAttenuation: false,
		transparent: true,
		opacity: 0.7,
		fog: false,
		depthWrite: false,
	});
	const points = new THREE.Points(geometry, material);
	points.name = "stars";
	points.renderOrder = -1;
	return points;
}
