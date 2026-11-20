import { describe, expect, it } from "vitest";
import { buildGraph, folderOf, normalizeTag } from "./buildGraph";
import type { SourceFile, VaultSnapshot } from "./vaultSnapshot";

function file(path: string, mtime = 2000, ctime = 1000): SourceFile {
	const name = path.slice(path.lastIndexOf("/") + 1);
	const dot = name.lastIndexOf(".");
	return {
		path,
		extension: dot > 0 ? name.slice(dot + 1) : "",
		basename: dot > 0 ? name.slice(0, dot) : name,
		mtime,
		ctime,
	};
}

function snapshot(
	paths: string[],
	links: Array<[string, string, number?]> = [],
	tags: Record<string, string[]> = {},
): VaultSnapshot {
	const resolvedLinks: Record<string, Record<string, number>> = {};
	for (const [source, target, count = 1] of links) {
		resolvedLinks[source] ??= {};
		resolvedLinks[source][target] = count;
	}
	return { files: paths.map((p) => file(p)), resolvedLinks, tags };
}

describe("buildGraph: explicit links", () => {
	it("creates one link edge for a one-way link, pointing from the linking note", () => {
		const g = buildGraph(snapshot(["A.md", "B.md"], [["B.md", "A.md"]]));
		expect(g.edges).toEqual([{ source: "B.md", target: "A.md", kind: "link", weight: 0.7 }]);
	});

	it("collapses mutual links into one edge with full weight", () => {
		const g = buildGraph(snapshot(["A.md", "B.md"], [["A.md", "B.md"], ["B.md", "A.md"]]));
		expect(g.edges).toHaveLength(1);
		expect(g.edges[0]).toMatchObject({ kind: "link", weight: 1 });
	});

	it("collapses duplicate references (count > 1) into one edge", () => {
		const g = buildGraph(snapshot(["A.md", "B.md"], [["A.md", "B.md", 5]]));
		expect(g.edges).toHaveLength(1);
	});

	it("ignores self-links", () => {
		const g = buildGraph(snapshot(["A.md"], [["A.md", "A.md"]]));
		expect(g.edges).toEqual([]);
		expect(g.nodes[0]?.degree).toBe(0);
	});

	it("ignores links whose endpoints are not in the snapshot", () => {
		const g = buildGraph(snapshot(["A.md"], [["A.md", "Missing.md"], ["Gone.md", "A.md"]]));
		expect(g.edges).toEqual([]);
	});

	it("ignores zero or negative counts", () => {
		const g = buildGraph(snapshot(["A.md", "B.md"], [["A.md", "B.md", 0]]));
		expect(g.edges).toEqual([]);
	});

	it("links attachments like any other node", () => {
		const g = buildGraph(snapshot(["Notes.md", "Spec.pdf"], [["Notes.md", "Spec.pdf"]]));
		expect(g.edges).toEqual([{ source: "Notes.md", target: "Spec.pdf", kind: "link", weight: 0.7 }]);
		const spec = g.nodes.find((n) => n.id === "Spec.pdf");
		expect(spec).toMatchObject({ type: "pdf", title: "Spec", degree: 1 });
	});
});

describe("buildGraph: shared tags", () => {
	it("connects notes that share a tag, with the tag as the reason", () => {
		const g = buildGraph(
			snapshot(["A.md", "B.md"], [], { "A.md": ["#design"], "B.md": ["design"] }),
		);
		expect(g.edges).toEqual([
			{ source: "A.md", target: "B.md", kind: "tag", weight: 0.3, reason: "#design" },
		]);
	});

	it("normalizes case and leading hashes before matching", () => {
		expect(normalizeTag("##Design ")).toBe("design");
		expect(normalizeTag("#")).toBeNull();
		const g = buildGraph(snapshot(["A.md", "B.md"], [], { "A.md": ["#Design"], "B.md": ["DESIGN"] }));
		expect(g.edges).toHaveLength(1);
	});

	it("does not draw a tag edge for a pair already joined by a link", () => {
		const g = buildGraph(
			snapshot(["A.md", "B.md"], [["A.md", "B.md"]], { "A.md": ["x"], "B.md": ["x"] }),
		);
		expect(g.edges).toHaveLength(1);
		expect(g.edges[0]?.kind).toBe("link");
	});

	it("weights a pair by the number of shared tags, capped at 1", () => {
		const tags = ["a", "b", "c", "d"];
		const g = buildGraph(snapshot(["X.md", "Y.md"], [], { "X.md": tags, "Y.md": tags }));
		expect(g.edges[0]).toMatchObject({ kind: "tag", weight: 1, reason: "#a #b #c #d" });
	});

	it("links large tag groups as a chain instead of pairwise", () => {
		const paths = Array.from({ length: 20 }, (_, i) => `N${String(i).padStart(2, "0")}.md`);
		const tags = Object.fromEntries(paths.map((p) => [p, ["big"]]));
		const g = buildGraph(snapshot(paths, [], tags), { maxPairwiseTagGroup: 8 });
		expect(g.edges).toHaveLength(19);
		expect(g.edges.every((e) => e.kind === "tag")).toBe(true);
	});

	it("links small tag groups pairwise", () => {
		const paths = ["A.md", "B.md", "C.md"];
		const tags = Object.fromEntries(paths.map((p) => [p, ["t"]]));
		const g = buildGraph(snapshot(paths, [], tags));
		expect(g.edges).toHaveLength(3);
	});
});

describe("buildGraph: nodes", () => {
	it("derives type, folder, title and passes timestamps through", () => {
		const s: VaultSnapshot = {
			files: [
				{ path: "Projects/Alpha/Plan.md", extension: "md", basename: "Plan", mtime: 30, ctime: 10 },
				{ path: "Root.PDF", extension: "PDF", basename: "Root", mtime: 1, ctime: 1 },
				{ path: "x.xyz", extension: "xyz", basename: "x", mtime: 1, ctime: 1 },
			],
			resolvedLinks: {},
			tags: {},
		};
		const g = buildGraph(s);
		expect(g.nodes.map((n) => n.id)).toEqual(["Projects/Alpha/Plan.md", "Root.PDF", "x.xyz"]);
		expect(g.nodes[0]).toEqual({
			id: "Projects/Alpha/Plan.md",
			title: "Plan",
			type: "md",
			folder: "Projects/Alpha",
			tags: [],
			mtime: 30,
			ctime: 10,
			degree: 0,
			cluster: -1,
		});
		expect(g.nodes[1]).toMatchObject({ type: "pdf", folder: "" });
		expect(g.nodes[2]).toMatchObject({ type: "other" });
	});

	it("computes degree from emitted edges, counting both endpoints", () => {
		const g = buildGraph(
			snapshot(["Hub.md", "A.md", "B.md", "C.md"], [["Hub.md", "A.md"], ["B.md", "Hub.md"], ["C.md", "Hub.md"]]),
		);
		const degree = Object.fromEntries(g.nodes.map((n) => [n.id, n.degree]));
		expect(degree).toEqual({ "A.md": 1, "B.md": 1, "C.md": 1, "Hub.md": 3 });
	});

	it("stores each node's normalized, sorted tags", () => {
		const g = buildGraph(snapshot(["A.md"], [], { "A.md": ["#Zeta", "alpha", "zeta"] }));
		expect(g.nodes[0]?.tags).toEqual(["alpha", "zeta"]);
	});

	it("derives folder paths", () => {
		expect(folderOf("a/b/c.md")).toBe("a/b");
		expect(folderOf("c.md")).toBe("");
	});
});

describe("buildGraph: rename", () => {
	it("moves the node id and re-points edges after a rename, with no stale edges", () => {
		const before = snapshot(["Index.md", "Old Name.md"], [["Index.md", "Old Name.md"]]);
		const g1 = buildGraph(before);
		expect(g1.edges[0]).toMatchObject({ source: "Index.md", target: "Old Name.md" });

		// Obsidian rewrites links and updates resolvedLinks on rename.
		const after: VaultSnapshot = {
			files: [file("Index.md"), file("New Name.md")],
			resolvedLinks: { "Index.md": { "New Name.md": 1 } },
			tags: {},
		};
		const g2 = buildGraph(after);
		expect(g2.nodes.map((n) => n.id)).toEqual(["Index.md", "New Name.md"]);
		expect(g2.edges).toEqual([{ source: "Index.md", target: "New Name.md", kind: "link", weight: 0.7 }]);
		expect(g2.nodes.find((n) => n.id === "Old Name.md")).toBeUndefined();
	});

	it("drops the link when the target is deleted, without keeping a dangling edge", () => {
		const g = buildGraph({
			files: [file("Index.md")],
			resolvedLinks: { "Index.md": { "Old Name.md": 1 } },
			tags: {},
		});
		expect(g.edges).toEqual([]);
		expect(g.nodes[0]?.degree).toBe(0);
	});
});

describe("buildGraph: determinism", () => {
	it("gives the same graph regardless of input file order", () => {
		const links: Array<[string, string]> = [["A.md", "B.md"], ["C.md", "A.md"], ["B.md", "C.md"]];
		const tags = { "A.md": ["t"], "C.md": ["t"] };
		const forward = buildGraph(snapshot(["A.md", "B.md", "C.md"], links, tags));
		const reversed = buildGraph(snapshot(["C.md", "B.md", "A.md"], [...links].reverse(), tags));
		expect(reversed).toEqual(forward);
	});
});
