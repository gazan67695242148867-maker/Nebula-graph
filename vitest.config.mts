import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		// dev-vault/.obsidian/plugins/nebula-graph is a junction back to this repo.
		// Keep test discovery out of it so every test runs once.
		include: ["src/**/*.test.ts"],
		exclude: ["**/node_modules/**", "dev-vault/**"],
	},
});
