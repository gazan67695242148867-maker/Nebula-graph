import { Plugin } from "obsidian";
import { GRAPH_VIEW_TYPE, GraphView } from "./render3d/GraphView";

/**
 * Plugin lifecycle only. Feature wiring lives in dedicated modules.
 */
export default class NebulaGraphPlugin extends Plugin {
	async onload(): Promise<void> {
		this.registerView(GRAPH_VIEW_TYPE, (leaf) => new GraphView(leaf));

		this.addCommand({
			id: "open-3d-graph",
			name: "Open graph view",
			callback: () => {
				void this.openGraphView();
			},
		});
	}

	onunload(): void {
		// Views are detached by Obsidian and release their own resources in onClose.
	}

	private async openGraphView(): Promise<void> {
		const { workspace } = this.app;
		const leaf = workspace.getLeavesOfType(GRAPH_VIEW_TYPE)[0] ?? workspace.getLeaf("tab");
		await leaf.setViewState({ type: GRAPH_VIEW_TYPE, active: true });
		await workspace.revealLeaf(leaf);
	}
}
