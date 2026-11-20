/**
 * Browser harness for the 3D scene. Runs GraphScene on synthetic data outside Obsidian.
 *
 *   npm run harness          # builds harness-dist/, then open harness-dist/index.html
 *
 * Query parameters:
 *   n=200        number of notes (default 200)
 *   light=1      use the light palette
 *   cycles=20    open and close the scene N times, then report leftover canvases and heap
 */
import { buildGraph } from "../../src/data/buildGraph";
import type { SourceFile, VaultSnapshot } from "../../src/data/vaultSnapshot";
import { GraphScene } from "../../src/render3d/GraphScene";

function mulberry32(seed: number): () => number {
	let s = seed >>> 0;
	return () => {
		s = (s + 0x6d2b79f5) >>> 0;
		let t = s;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Synthetic vault with preferential-attachment links and a few shared tags. */
function syntheticSnapshot(n: number): VaultSnapshot {
	const rnd = mulberry32(42);
	const folders = ["Inbox", "Projects", "Research", "Journal", "Reference"];
	const tagNames = ["design", "math", "todo", "graph", "idea", "reading"];
	const files: SourceFile[] = [];
	const tags: Record<string, string[]> = {};
	for (let i = 0; i < n; i++) {
		const folder = folders[Math.floor(rnd() * folders.length)] ?? "Inbox";
		const path = `${folder}/Note ${i}.md`;
		files.push({ path, extension: "md", basename: `Note ${i}`, mtime: i, ctime: i });
		if (rnd() < 0.6) {
			const tag = tagNames[Math.floor(Math.pow(rnd(), 2) * tagNames.length)] ?? "idea";
			tags[path] = [tag];
		}
	}
	const pool = files.map((_, i) => i);
	const resolvedLinks: Record<string, Record<string, number>> = {};
	files.forEach((file, i) => {
		const k = Math.min(10, Math.max(0, Math.floor(Math.pow(1 - rnd(), -1 / 1.5)) - 1));
		for (let a = 0; a < k; a++) {
			const j = pool[Math.floor(rnd() * pool.length)];
			const target = j === undefined ? undefined : files[j];
			if (!target || target.path === file.path) continue;
			const row = (resolvedLinks[file.path] ??= {});
			row[target.path] = 1;
			pool.push(j ?? i);
		}
		pool.push(i);
	});
	return { files, resolvedLinks, tags };
}

const params = new URLSearchParams(location.search);
const n = Number(params.get("n") ?? 200);
const light = params.get("light") === "1";
const cycles = Number(params.get("cycles") ?? 0);

const data = buildGraph(syntheticSnapshot(n));
const stats = document.getElementById("stats");
const setStat = (text: string): void => {
	if (stats) stats.textContent = text;
};

const host = document.getElementById("host");
if (!host) throw new Error("missing #host");

if (cycles > 0) {
	// Open and close repeatedly, then check that no canvases or heap growth are left behind.
	const heapBefore = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize;
	for (let c = 0; c < cycles; c++) {
		const holder = document.createElement("div");
		holder.style.cssText = "position:absolute;inset:0";
		host.appendChild(holder);
		const scene = new GraphScene(holder, { light });
		scene.setData(data);
		scene.dispose();
		holder.remove();
	}
	const canvases = document.querySelectorAll("canvas").length;
	const heapAfter = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize;
	const heapNote =
		heapBefore !== undefined && heapAfter !== undefined
			? `heap ${(heapBefore / 1e6).toFixed(1)} MB -> ${(heapAfter / 1e6).toFixed(1)} MB (GC timing makes this approximate)`
			: "heap not available in this browser";
	setStat(`cycles=${cycles} leftover canvases=${canvases}; ${heapNote}`);
	console.log(`CYCLE_RESULT canvases=${canvases} ${heapNote}`);
} else {
	const scene = new GraphScene(host, { light });
	scene.setData(data);
	(window as unknown as { __scene: GraphScene }).__scene = scene;
	setStat(`n=${data.nodes.length} nodes, ${data.edges.length} edges, light=${light}`);
	console.log(`SCENE_READY nodes=${data.nodes.length} edges=${data.edges.length}`);
}
