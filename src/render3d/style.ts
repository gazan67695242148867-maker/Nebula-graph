import * as THREE from "three";
import type { EdgeKind } from "../types";

/** Node radius grows with the square root of degree and is capped at 14 units. */
export function nodeRadius(degree: number): number {
	return Math.min(14, 1.5 + 1.2 * Math.sqrt(Math.max(0, degree)));
}

/** Golden-angle hue stepping: HSL(i * 137.5 mod 360, 65%, L). */
export function clusterColor(index: number, lightness: number): THREE.Color {
	const hue = (((index * 137.5) % 360) + 360) % 360;
	return new THREE.Color().setHSL(hue / 360, 0.65, lightness, THREE.SRGBColorSpace);
}

/** Opacity of each edge kind. Explicit links are the most prominent. */
export const EDGE_ALPHA: Record<EdgeKind, number> = {
	link: 0.55,
	tag: 0.25,
	// Not in the spec. Folder edges are not produced yet, so this is a placeholder set to match keyword.
	folder: 0.2,
	keyword: 0.2,
	semantic: 0.2,
};

/** Fat-line width in CSS pixels. Scaled by the device pixel ratio when rendering. */
export const EDGE_WIDTH_CSS_PX = 1.2;
