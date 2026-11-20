import * as THREE from "three";
import type { Palette } from "./palette";

/** Inside the camera far plane (4000) and beyond the max orbit distance (3000). */
const BACKGROUND_RADIUS = 3500;

/**
 * Vertical gradient on the inside of a large sphere. Vertex colours carry the gradient,
 * so the sphere needs no shader. It is not fogged, so it stays the exact palette colours.
 */
export function buildBackground(palette: Palette): THREE.Mesh {
	const geometry = new THREE.SphereGeometry(BACKGROUND_RADIUS, 32, 24);
	const position = geometry.attributes.position;
	if (!position) throw new Error("background sphere has no positions");

	const colors = new Float32Array(position.count * 3);
	const color = new THREE.Color();
	for (let i = 0; i < position.count; i++) {
		const t = (position.getY(i) / BACKGROUND_RADIUS + 1) / 2;
		color.copy(palette.bottom).lerp(palette.top, t);
		colors[i * 3] = color.r;
		colors[i * 3 + 1] = color.g;
		colors[i * 3 + 2] = color.b;
	}
	geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

	const material = new THREE.MeshBasicMaterial({
		vertexColors: true,
		side: THREE.BackSide,
		fog: false,
		depthWrite: false,
	});
	const mesh = new THREE.Mesh(geometry, material);
	mesh.name = "background";
	mesh.renderOrder = -1;
	return mesh;
}
