import type { GraphData, GraphEdge, GraphNode } from "../types";
import { docTypeOf } from "./docType";
import type { VaultSnapshot } from "./vaultSnapshot";

export interface BuildOptions {
	/**
	 * Tag groups up to this size are linked pairwise. Larger groups are linked as a
	 * chain in path order, which keeps the edge count linear in the number of notes.
	 */
	maxPairwiseTagGroup?: number;
}

const DEFAULT_PAIRWISE_TAG_GROUP = 8;
/** Explicit link only in one direction. */
const ONE_WAY_LINK_WEIGHT = 0.7;
/** Both notes link to each other. */
const MUTUAL_LINK_WEIGHT = 1;
/** Weight contributed by each shared tag, capped at 1. */
const TAG_WEIGHT_PER_SHARED = 0.3;

/** Normalize a tag: strip leading "#", trim, lowercase. Returns null for empty tags. */
export function normalizeTag(raw: string): string | null {
	const tag = raw.trim().replace(/^#+/, "").toLowerCase();
	return tag.length > 0 ? tag : null;
}

/** Folder part of a vault path. Root-level files get "". */
export function folderOf(path: string): string {
	const slash = path.lastIndexOf("/");
	return slash < 0 ? "" : path.slice(0, slash);
}

/** Key for an unordered pair, independent of argument order. */
function pairKey(a: string, b: string): string {
	return a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
}

interface PairState {
	/** Lower-sorted endpoint. */
	a: string;
	/** Higher-sorted endpoint. */
	b: string;
	/** a links to b. */
	aToB: boolean;
	/** b links to a. */
	bToA: boolean;
	/** Tags shared by both endpoints. */
	tags: Set<string>;
}

function pairFor(pairs: Map<string, PairState>, x: string, y: string): PairState {
	const key = pairKey(x, y);
	let state = pairs.get(key);
	if (!state) {
		const [a, b] = x < y ? [x, y] : [y, x];
		state = { a, b, aToB: false, bToA: false, tags: new Set() };
		pairs.set(key, state);
	}
	return state;
}

/**
 * Build the graph for a vault snapshot.
 *
 * Edges: one per unordered pair of notes. An explicit link always wins over a shared tag,
 * so a pair never draws twice. Self-links, links to missing files, and duplicate
 * references are dropped. Output is sorted by id, so the same snapshot gives the same graph.
 */
export function buildGraph(snapshot: VaultSnapshot, options: BuildOptions = {}): GraphData {
	const maxPairwise = options.maxPairwiseTagGroup ?? DEFAULT_PAIRWISE_TAG_GROUP;
	const files = [...snapshot.files].sort((x, y) => (x.path < y.path ? -1 : x.path > y.path ? 1 : 0));
	const ids = new Set(files.map((f) => f.path));
	const pairs = new Map<string, PairState>();

	// 1. Explicit links.
	for (const [source, targets] of Object.entries(snapshot.resolvedLinks)) {
		if (!ids.has(source)) continue;
		for (const [target, count] of Object.entries(targets)) {
			if (source === target || !ids.has(target) || count <= 0) continue;
			const pair = pairFor(pairs, source, target);
			if (source === pair.a) pair.aToB = true;
			else pair.bToA = true;
		}
	}

	// 2. Shared tags. Each note's tags are normalized and deduplicated first.
	const tagsOfNode = new Map<string, string[]>();
	const notesByTag = new Map<string, string[]>();
	for (const file of files) {
		const raw = snapshot.tags[file.path] ?? [];
		const normalized = [...new Set(raw.map(normalizeTag).filter((t): t is string => t !== null))].sort();
		tagsOfNode.set(file.path, normalized);
		for (const tag of normalized) {
			const group = notesByTag.get(tag);
			if (group) group.push(file.path);
			else notesByTag.set(tag, [file.path]);
		}
	}
	for (const [tag, group] of notesByTag) {
		if (group.length < 2) continue;
		if (group.length <= maxPairwise) {
			for (let i = 0; i < group.length; i++) {
				for (let j = i + 1; j < group.length; j++) {
					pairFor(pairs, group[i] ?? "", group[j] ?? "").tags.add(tag);
				}
			}
		} else {
			for (let i = 0; i + 1 < group.length; i++) {
				pairFor(pairs, group[i] ?? "", group[i + 1] ?? "").tags.add(tag);
			}
		}
	}

	// 3. Emit one edge per pair. Explicit links take priority over tags.
	const sortedKeys = [...pairs.keys()].sort();
	const edges: GraphEdge[] = [];
	const degree = new Map<string, number>();
	for (const key of sortedKeys) {
		const pair = pairs.get(key);
		if (!pair) continue;
		let edge: GraphEdge | null = null;
		if (pair.aToB || pair.bToA) {
			const mutual = pair.aToB && pair.bToA;
			// One-way links point from the linking note to the linked one. Mutual links keep the sorted order.
			const forward = mutual || pair.aToB;
			edge = {
				source: forward ? pair.a : pair.b,
				target: forward ? pair.b : pair.a,
				kind: "link",
				weight: mutual ? MUTUAL_LINK_WEIGHT : ONE_WAY_LINK_WEIGHT,
			};
		} else if (pair.tags.size > 0) {
			const shared = [...pair.tags].sort();
			edge = {
				source: pair.a,
				target: pair.b,
				kind: "tag",
				weight: Math.min(1, TAG_WEIGHT_PER_SHARED * shared.length),
				reason: shared.map((t) => `#${t}`).join(" "),
			};
		}
		if (!edge) continue;
		edges.push(edge);
		degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
		degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
	}

	const nodes: GraphNode[] = files.map((file) => ({
		id: file.path,
		title: file.basename,
		type: docTypeOf(file.extension),
		folder: folderOf(file.path),
		tags: tagsOfNode.get(file.path) ?? [],
		mtime: file.mtime,
		ctime: file.ctime,
		degree: degree.get(file.path) ?? 0,
		cluster: -1,
	}));

	return { nodes, edges };
}
