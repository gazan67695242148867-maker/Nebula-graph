import { ItemView, type WorkspaceLeaf } from "obsidian";
import { buildGraphFromApp } from "../data/obsidianSnapshot";
import { GraphScene } from "./GraphScene";

export const GRAPH_VIEW_TYPE = "nebula-graph-3d";

/**
 * Workspace view that shows the vault as a 3D graph. The scene is created when the
 * view opens and fully released when it closes.
 */
export class GraphView extends ItemView {
	private scene: GraphScene | null = null;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType(): string {
		return GRAPH_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Nebula graph";
	}

	getIcon(): string {
		return "dot-network";
	}

	async onOpen(): Promise<void> {
		this.contentEl.empty();
		this.contentEl.addClass("nebula-graph-view");
		const host = this.contentEl.createDiv({ cls: "nebula-graph-host" });

		const light = document.body.classList.contains("theme-light");
		this.scene = new GraphScene(host, { light });
		this.scene.setData(buildGraphFromApp(this.app));
	}

	async onClose(): Promise<void> {
		this.scene?.dispose();
		this.scene = null;
		this.contentEl.empty();
	}
}
