import { getAllTags, type App } from "obsidian";
import { buildGraph, type BuildOptions } from "./buildGraph";
import type { SourceFile, VaultSnapshot } from "./vaultSnapshot";
import type { GraphData } from "../types";

/**
 * Read the live vault into a VaultSnapshot. Only metadata is read; note bodies are not.
 * Tags come from getAllTags(), which merges inline and frontmatter tags.
 */
export function snapshotFromApp(app: App): VaultSnapshot {
	const files: SourceFile[] = [];
	const tags: Record<string, string[]> = {};

	for (const file of app.vault.getFiles()) {
		files.push({
			path: file.path,
			extension: file.extension,
			basename: file.basename,
			mtime: file.stat.mtime,
			ctime: file.stat.ctime,
		});
		if (file.extension === "md") {
			const cache = app.metadataCache.getFileCache(file);
			const found = cache ? getAllTags(cache) : null;
			if (found && found.length > 0) tags[file.path] = found;
		}
	}

	return {
		files,
		resolvedLinks: app.metadataCache.resolvedLinks,
		tags,
	};
}

/** Build GraphData for the live vault. */
export function buildGraphFromApp(app: App, options?: BuildOptions): GraphData {
	return buildGraph(snapshotFromApp(app), options);
}
