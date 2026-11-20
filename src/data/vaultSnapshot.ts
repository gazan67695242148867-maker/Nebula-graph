/**
 * Plain-data view of a vault. buildGraph() consumes this, so the graph logic
 * can be unit-tested without Obsidian. The Obsidian adapter lives in obsidianSnapshot.ts.
 */

export interface SourceFile {
	/** Vault-relative path, unique. */
	path: string;
	/** Extension without the dot, e.g. "md", "pdf". Empty when there is none. */
	extension: string;
	/** File name without its extension. */
	basename: string;
	/** Milliseconds since epoch. */
	mtime: number;
	/** Milliseconds since epoch. */
	ctime: number;
}

export interface VaultSnapshot {
	files: SourceFile[];
	/**
	 * Resolved outgoing links, the same shape as Obsidian's metadataCache.resolvedLinks:
	 * source path -> target path -> number of references.
	 * Unresolved links must not appear here.
	 */
	resolvedLinks: Record<string, Record<string, number>>;
	/** Tags per file path, as written in the note (with or without "#"). */
	tags: Record<string, string[]>;
}
