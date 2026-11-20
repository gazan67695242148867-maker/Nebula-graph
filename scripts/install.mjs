// Copy the built plugin into an Obsidian vault.
//
//   node scripts/install.mjs "<vault path>"
//
// Copies only main.js, manifest.json and styles.css into
// <vault>/.obsidian/plugins/nebula-graph/. Nothing else in the vault is read,
// written or deleted. No symlinks, no shell-specific commands.
import { copyFile, lstat, mkdir, realpath, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PLUGIN_ID = "nebula-graph";
const FILES = ["main.js", "manifest.json", "styles.css"];

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

function fail(message) {
	console.error(`install: ${message}`);
	process.exit(1);
}

async function isDirectory(path) {
	try {
		return (await stat(path)).isDirectory();
	} catch {
		return false;
	}
}

async function main() {
	const arg = process.argv[2];
	if (!arg) {
		fail('missing vault path. Usage: node scripts/install.mjs "<vault path>"');
	}

	const vault = resolve(arg);
	if (!(await isDirectory(join(vault, ".obsidian")))) {
		fail(`${vault} is not an Obsidian vault (no .obsidian folder found). Nothing was copied.`);
	}

	for (const name of FILES) {
		const source = join(repoRoot, name);
		try {
			await stat(source);
		} catch {
			fail(`${name} not found in ${repoRoot}. Run "npm run build" first.`);
		}
	}

	const pluginsDir = join(vault, ".obsidian", "plugins");
	const dest = join(pluginsDir, PLUGIN_ID);

	// Make the plugin folder if it's missing. Never create anything else.
	await mkdir(dest, { recursive: true });

	// Refuse to write through a symlink or junction. Copying a file onto itself would be a no-op at best.
	const destStat = await lstat(dest);
	if (destStat.isSymbolicLink()) {
		fail(
			`${dest} is a link, not a folder. Remove the link itself first (Windows: rmdir "${dest}" removes only the link). Nothing was copied.`,
		);
	}
	if ((await realpath(dest)) === (await realpath(repoRoot))) {
		fail(`${dest} resolves to the repo itself. Nothing was copied.`);
	}

	console.log(`Installing ${PLUGIN_ID} into ${dest}`);
	for (const name of FILES) {
		const target = join(dest, name);
		await copyFile(join(repoRoot, name), target);
		console.log(`  copied ${name} -> ${target}`);
	}
	console.log(`Done. Copied ${FILES.length} files. Nothing else in the vault was touched.`);
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
