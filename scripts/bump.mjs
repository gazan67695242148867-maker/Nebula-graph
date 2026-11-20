// Runs from the npm "version" lifecycle hook, after npm has already updated package.json.
//
//   npm version patch|minor|major
//
// Copies the new version into manifest.json, adds it to versions.json, and stages both
// so npm includes them in the version commit. Replaces the sample's version-bump.mjs.
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const target = process.env.npm_package_version;
if (!target) {
	console.error("bump: run this through npm, e.g. npm version patch");
	process.exit(1);
}

const manifestPath = join(root, "manifest.json");
const versionsPath = join(root, "versions.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const versions = JSON.parse(readFileSync(versionsPath, "utf8"));

manifest.version = target;
writeFileSync(manifestPath, JSON.stringify(manifest, null, "\t") + "\n");

// Keep existing entries intact. Only add this version if it's new.
if (!(target in versions)) {
	versions[target] = manifest.minAppVersion;
	writeFileSync(versionsPath, JSON.stringify(versions, null, "\t") + "\n");
}

execFileSync("git", ["add", "manifest.json", "versions.json"], { cwd: root, stdio: "inherit" });
console.log(`bump: manifest.json and versions.json set to ${target} and staged`);
