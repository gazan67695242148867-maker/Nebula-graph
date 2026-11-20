import * as THREE from "three";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import type { EdgeKind, GraphEdge } from "../types";
import { EDGE_ALPHA, EDGE_WIDTH_CSS_PX } from "./style";

export interface EdgeLines {
	group: THREE.Group;
	/**
	 * Call after a resize. Width and height are in device pixels (drawing buffer size).
	 * LineMaterial sizes lines against this resolution, so the 1.2 px width is scaled by the pixel ratio.
	 */
	resize(bufferWidth: number, bufferHeight: number, pixelRatio: number): void;
}

const KINDS: EdgeKind[] = ["link", "tag", "folder", "keyword", "semantic"];

/**
 * One LineSegments2 per edge kind. LineMaterial takes a single opacity per material,
 * so each kind gets its own material with its own alpha.
 * Each segment is coloured by blending the colours of its two endpoint nodes.
 */
export function buildEdgeLines(
	edges: GraphEdge[],
	indexOf: Map<string, number>,
	positions: Float32Array,
	colors: THREE.Color[],
): EdgeLines {
	const group = new THREE.Group();
	const materials: LineMaterial[] = [];
	const geometries: LineSegmentsGeometry[] = [];

	for (const kind of KINDS) {
		const segments: number[] = [];
		const segmentColors: number[] = [];

		for (const edge of edges) {
			if (edge.kind !== kind) continue;
			const a = indexOf.get(edge.source);
			const b = indexOf.get(edge.target);
			const ca = a === undefined ? undefined : colors[a];
			const cb = b === undefined ? undefined : colors[b];
			if (a === undefined || b === undefined || !ca || !cb) continue;

			segments.push(
				positions[a * 3] ?? 0,
				positions[a * 3 + 1] ?? 0,
				positions[a * 3 + 2] ?? 0,
				positions[b * 3] ?? 0,
				positions[b * 3 + 1] ?? 0,
				positions[b * 3 + 2] ?? 0,
			);
			segmentColors.push(ca.r, ca.g, ca.b, cb.r, cb.g, cb.b);
		}

		if (segments.length === 0) continue;

		const geometry = new LineSegmentsGeometry();
		geometry.setPositions(segments);
		geometry.setColors(segmentColors);
		geometries.push(geometry);

		const material = new LineMaterial({
			linewidth: EDGE_WIDTH_CSS_PX,
			vertexColors: true,
			transparent: true,
			opacity: EDGE_ALPHA[kind],
			depthWrite: false,
		});
		materials.push(material);

		const line = new LineSegments2(geometry, material);
		line.name = `edges:${kind}`;
		group.add(line);
	}

	return {
		group,
		resize(bufferWidth, bufferHeight, pixelRatio) {
			for (const material of materials) {
				material.resolution.set(bufferWidth, bufferHeight);
				material.linewidth = EDGE_WIDTH_CSS_PX * pixelRatio;
			}
		},
	};
}
