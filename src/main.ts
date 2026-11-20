import { Plugin } from "obsidian";

/**
 * Plugin lifecycle only. Feature wiring lives in dedicated modules.
 */
export default class NebulaGraphPlugin extends Plugin {
	async onload(): Promise<void> {
		// Views and commands are registered in later milestones.
	}

	onunload(): void {
		// Nothing to clean up yet.
	}
}
