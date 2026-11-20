// Link the repo root into the dev vault as an installed plugin.
// Obsidian loads main.js, manifest.json and styles.css from the plugin folder,
// and those are written to the repo root by `npm run dev` / `npm run build`.
// On Windows a directory junction is used, which needs no admin rights or Developer Mode.
import { existsSync, lstatSync, mkdirSync, rmdirSync, symlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(fileURLToPath(new URL("..", import.meta.url)));
const vault = join(repo, "dev-vault");
if (!existsSync(join(vault, ".obsidian"))) {
	console.error("dev-vault is missing. Run `npm run generate` first.");
	process.exit(1);
}

const pluginsDir = join(vault, ".obsidian", "plugins");
mkdirSync(pluginsDir, { recursive: true });
const link = join(pluginsDir, "nebula-graph");

try {
	const stat = lstatSync(link);
	if (!stat.isSymbolicLink()) {
		console.error(`Refusing to replace a real directory at ${link}`);
		process.exit(1);
	}
	// rmdir removes only the link itself, never the directory it points to.
	rmdirSync(link);
} catch (err) {
	if (err.code !== "ENOENT") throw err;
}

symlinkSync(repo, link, "junction");
console.log(`Linked ${repo} -> ${link}`);
