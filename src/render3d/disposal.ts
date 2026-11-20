import type * as THREE from "three";

/**
 * Dispose every geometry, material and render target under an object, then detach it.
 * Textures are disposed through their material and not counted twice.
 */
export function disposeTree(root: THREE.Object3D): void {
	root.traverse((child) => {
		const withResources = child as THREE.Object3D & {
			geometry?: { dispose(): void };
			material?: { dispose(): void } | Array<{ dispose(): void }>;
		};
		withResources.geometry?.dispose();
		const material = withResources.material;
		if (Array.isArray(material)) {
			for (const m of material) m.dispose();
		} else {
			material?.dispose();
		}
	});
	root.removeFromParent();
}
