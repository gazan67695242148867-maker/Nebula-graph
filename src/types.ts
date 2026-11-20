/** Kind of file a graph node represents. Derived from the file extension. */
export type DocType = "md" | "pdf" | "docx" | "pptx" | "txt" | "csv" | "html" | "other";

/** Why two nodes are connected. */
export type EdgeKind = "link" | "tag" | "folder" | "keyword" | "semantic";

export interface GraphNode {
	/** Vault path, e.g. "Projects/Alpha/Plan.md". Unique. */
	id: string;
	title: string;
	type: DocType;
	folder: string;
	tags: string[];
	/** Milliseconds since epoch. */
	mtime: number;
	/** Milliseconds since epoch. */
	ctime: number;
	/** Number of incident edges. Filled in by the builder after edges are known. */
	degree: number;
	/** Louvain cluster index, or -1 until clustering runs. */
	cluster: number;
}

export interface GraphEdge {
	source: string;
	target: string;
	kind: EdgeKind;
	/** 0..1 */
	weight: number;
	reason?: string;
}

export interface GraphData {
	nodes: GraphNode[];
	edges: GraphEdge[];
}
