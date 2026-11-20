// Verify that every version source agrees, and that an optional release tag matches it.
//
//   node scripts/check-version.mjs            # checks package.json, manifest.json, versions.json
//   node scripts/check-version.mjs 0.1.0      # also requires the tag to equal manifest.json version
//
// Tags must be bare semver ("0.1.0"), never "v0.1.0". Exits 1 on any mismatch.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (name) => JSON.parse(readFileSync(join(root, name), "utf8"));

const errors = [];
const pkg = read("package.json");
const manifest = read("manifest.json");
const versions = read("versions.json");
const SEMVER = /^\d+\.\d+\.\d+$/;

if (!SEMVER.test(manifest.version)) errors.push(`manifest.json version "${manifest.version}" is not x.y.z`);
if (pkg.version !== manifest.version) {
	errors.push(`package.json version "${pkg.version}" differs from manifest.json "${manifest.version}"`);
}
if (!(manifest.version in versions)) {
	errors.push(`versions.json has no entry for "${manifest.version}"`);
} else if (versions[manifest.version] !== manifest.minAppVersion) {
	errors.push(
		`versions.json maps "${manifest.version}" to "${versions[manifest.version]}", expected minAppVersion "${manifest.minAppVersion}"`,
	);
}

const tag = process.argv[2];
if (tag !== undefined) {
	if (!SEMVER.test(tag)) errors.push(`tag "${tag}" is not bare x.y.z (no leading "v")`);
	else if (tag !== manifest.version) errors.push(`tag "${tag}" differs from manifest.json version "${manifest.version}"`);
}

if (errors.length > 0) {
	for (const e of errors) console.error(`check-version: ${e}`);
	process.exit(1);
}
console.log(`check-version: ok (${manifest.version}${tag ? `, tag ${tag}` : ""})`);
