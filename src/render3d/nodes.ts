import * as THREE from "three";
import type { GraphNode } from "../types";
import { nodeRadius } from "./style";

/**
 * All nodes as one InstancedMesh, so the whole graph costs a single draw call.
 * Instance i corresponds to nodes[i] and positions[3i..3i+2].
 */
export function buildNodeMesh(nodes: GraphNode[], positions: Float32Array, colors: THREE.Color[]): THREE.InstancedMesh {
	const geometry = new THREE.IcosahedronGeometry(1, 2);
	// Milestone 2 uses a plain lit material. The glass material arrives in milestone 5.
	const material = new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0 });
	const mesh = new THREE.InstancedMesh(geometry, material, nodes.length);

	const matrix = new THREE.Matrix4();
	const position = new THREE.Vector3();
	const scale = new THREE.Vector3();
	const identity = new THREE.Quaternion();

	for (let i = 0; i < nodes.length; i++) {
		const node = nodes[i];
		const color = colors[i];
		if (!node || !color) continue;
		position.set(positions[i * 3] ?? 0, positions[i * 3 + 1] ?? 0, positions[i * 3 + 2] ?? 0);
		const r = nodeRadius(node.degree);
		scale.set(r, r, r);
		matrix.compose(position, identity, scale);
		mesh.setMatrixAt(i, matrix);
		mesh.setColorAt(i, color);
	}

	mesh.instanceMatrix.needsUpdate = true;
	if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
	mesh.computeBoundingSphere();
	return mesh;
}
