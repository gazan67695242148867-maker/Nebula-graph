import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { GraphData } from "../types";
import { buildBackground } from "./background";
import { disposeTree } from "./disposal";
import { buildEdgeLines, type EdgeLines } from "./edges";
import { boundingSphere, fibonacciSphere } from "./layout";
import { buildNodeMesh } from "./nodes";
import { paletteFor, type Palette } from "./palette";
import { clusterColor } from "./style";
import { buildStars } from "./stars";

const STAR_COUNT = 1500;
const FOV = 50;
const NEAR = 0.1;
const FAR = 4000;
const FOG_DENSITY = 0.0016;
const INITIAL_DISTANCE_FACTOR = 2.2;
const MIN_DISTANCE = 20;
const MAX_DISTANCE = 3000;
const MAX_PIXEL_RATIO = 2;
/** Initial view direction from the centroid: a little above and in front. */
const VIEW_DIRECTION = new THREE.Vector3(0.25, 0.35, 1).normalize();

export interface GraphSceneOptions {
	/** Use the light palette. */
	light: boolean;
}

/**
 * Owns one WebGL renderer and its scene. Renders only when something changed:
 * a resize, new data, or an in-progress camera move (OrbitControls damping).
 * Idle cost is zero.
 */
export class GraphScene {
	private readonly renderer: THREE.WebGLRenderer;
	private readonly scene = new THREE.Scene();
	private readonly camera: THREE.PerspectiveCamera;
	private readonly controls: OrbitControls;
	private readonly resizeObserver: ResizeObserver;
	private readonly palette: Palette;
	private readonly background: THREE.Mesh;
	/** The window that owns the host element. May differ from the main window in a popout. */
	private readonly win: Window;
	private stars: THREE.Points | null = null;

	private nodeMesh: THREE.InstancedMesh | null = null;
	private edgeLines: EdgeLines | null = null;
	private edgeGroup: THREE.Group | null = null;
	private frameRequested = false;
	private contextLost = false;
	private disposed = false;

	constructor(private readonly host: HTMLElement, options: GraphSceneOptions) {
		this.win = host.ownerDocument.defaultView ?? window;
		this.palette = paletteFor(options.light);

		this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
		this.renderer.setClearColor(this.palette.bottom);
		this.renderer.domElement.className = "nebula-graph-canvas";
		this.renderer.domElement.addEventListener("webglcontextlost", this.onContextLost);
		this.renderer.domElement.addEventListener("webglcontextrestored", this.onContextRestored);
		host.appendChild(this.renderer.domElement);

		this.background = buildBackground(this.palette);
		this.scene.add(this.background);
		if (this.palette.stars) {
			this.stars = buildStars(STAR_COUNT);
			this.scene.add(this.stars);
		}
		this.scene.fog = new THREE.FogExp2(this.palette.fog, FOG_DENSITY);
		this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));
		const key = new THREE.DirectionalLight(0xffffff, 1.0);
		key.position.set(1, 1.5, 1);
		this.scene.add(key);

		this.camera = new THREE.PerspectiveCamera(FOV, 1, NEAR, FAR);

		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.enableDamping = true;
		this.controls.dampingFactor = 0.08;
		this.controls.rotateSpeed = 0.6;
		this.controls.zoomToCursor = true;
		this.controls.minDistance = MIN_DISTANCE;
		this.controls.maxDistance = MAX_DISTANCE;
		this.controls.addEventListener("change", this.requestFrame);

		this.resizeObserver = new ResizeObserver(() => this.resize());
		this.resizeObserver.observe(host);
		this.resize();
	}

	/** Replace the displayed graph. Positions are a Fibonacci sphere for now. */
	setData(data: GraphData): void {
		this.clearContent();
		const { nodes, edges } = data;
		if (nodes.length === 0) {
			this.requestFrame();
			return;
		}

		const positions = fibonacciSphere(nodes.length);
		const indexOf = new Map<string, number>();
		nodes.forEach((node, i) => indexOf.set(node.id, i));

		// Until Louvain runs (milestone 5) nodes have cluster -1, so the folder stands in as the colour group.
		const folders = [...new Set(nodes.map((n) => n.folder))].sort();
		const folderIndex = new Map(folders.map((f, i) => [f, i]));
		const colors = nodes.map((node) => {
			const key = node.cluster >= 0 ? node.cluster : (folderIndex.get(node.folder) ?? 0);
			return clusterColor(key, this.palette.nodeLightness);
		});

		this.nodeMesh = buildNodeMesh(nodes, positions, colors);
		this.scene.add(this.nodeMesh);

		const lines = buildEdgeLines(edges, indexOf, positions, colors);
		this.edgeLines = lines;
		this.edgeGroup = lines.group;
		this.scene.add(lines.group);
		this.applyResolution();

		const sphere = boundingSphere(positions);
		this.frameSphere(sphere.cx, sphere.cy, sphere.cz, sphere.radius);
		this.requestFrame();
	}

	/** Release every GPU resource and the canvas. Safe to call more than once. */
	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;
		this.resizeObserver.disconnect();
		this.controls.removeEventListener("change", this.requestFrame);
		this.renderer.domElement.removeEventListener("webglcontextlost", this.onContextLost);
		this.renderer.domElement.removeEventListener("webglcontextrestored", this.onContextRestored);
		this.controls.dispose();
		this.clearContent();
		disposeTree(this.background);
		if (this.stars) disposeTree(this.stars);
		this.stars = null;
		this.renderer.dispose();
		this.renderer.forceContextLoss();
		this.renderer.domElement.remove();
	}

	/** Stop drawing while the GPU context is gone. three.js restores its own GPU state on restore. */
	private readonly onContextLost = (event: Event): void => {
		event.preventDefault();
		this.contextLost = true;
	};

	private readonly onContextRestored = (): void => {
		this.contextLost = false;
		this.resize();
		this.requestFrame();
	};

	private clearContent(): void {
		if (this.nodeMesh) disposeTree(this.nodeMesh);
		if (this.edgeGroup) disposeTree(this.edgeGroup);
		this.nodeMesh = null;
		this.edgeGroup = null;
		this.edgeLines = null;
	}

	private readonly requestFrame = (): void => {
		if (this.frameRequested || this.disposed) return;
		this.frameRequested = true;
		this.win.requestAnimationFrame(this.tick);
	};

	private readonly tick = (): void => {
		this.frameRequested = false;
		if (this.disposed || this.contextLost) return;
		const moving = this.controls.update();
		this.renderer.render(this.scene, this.camera);
		if (moving) this.requestFrame();
	};

	private resize(): void {
		const width = this.host.clientWidth;
		const height = this.host.clientHeight;
		if (width === 0 || height === 0 || this.disposed) return;

		const pixelRatio = Math.min(this.win.devicePixelRatio, MAX_PIXEL_RATIO);
		this.renderer.setPixelRatio(pixelRatio);
		// false: the canvas CSS size comes from the stylesheet, so the element keeps tracking its container.
		this.renderer.setSize(width, height, false);
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
		this.applyResolution();
		this.requestFrame();
	}

	private applyResolution(): void {
		if (!this.edgeLines) return;
		const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
		this.edgeLines.resize(size.x, size.y, this.renderer.getPixelRatio());
	}

	private frameSphere(cx: number, cy: number, cz: number, radius: number): void {
		const center = new THREE.Vector3(cx, cy, cz);
		const distance = Math.max(radius * INITIAL_DISTANCE_FACTOR, MIN_DISTANCE * 2);
		this.controls.target.copy(center);
		this.camera.position.copy(center).addScaledVector(VIEW_DIRECTION, distance);
		this.camera.lookAt(center);
		this.controls.update();
	}
}
