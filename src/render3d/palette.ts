import * as THREE from "three";

export interface Palette {
	/** Top of the background gradient. */
	top: THREE.Color;
	/** Bottom of the background gradient. Also the clear colour. */
	bottom: THREE.Color;
	/** Fog colour. Matches the middle of the gradient so distant nodes fade into it. */
	fog: THREE.Color;
	/** HSL lightness for cluster colours. */
	nodeLightness: number;
	/** Whether the background gets a star field. Dark theme only. */
	stars: boolean;
}

const DARK = {
	bottom: "#05070D",
	top: "#0B1020",
	nodeLightness: 0.62,
	stars: true,
};

const LIGHT = {
	bottom: "#F4F6FB",
	top: "#E6EAF5",
	nodeLightness: 0.45,
	stars: false,
};

/** Palette for the Aurora Lattice look. The light variant is picked from the Obsidian theme. */
export function paletteFor(light: boolean): Palette {
	const source = light ? LIGHT : DARK;
	const bottom = new THREE.Color(source.bottom);
	const top = new THREE.Color(source.top);
	return {
		bottom,
		top,
		fog: new THREE.Color().lerpColors(bottom, top, 0.5),
		nodeLightness: source.nodeLightness,
		stars: source.stars,
	};
}
