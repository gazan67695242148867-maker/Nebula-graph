// Bundle the browser harness into harness-dist/ so index.html can be opened directly from disk.
import { copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";

const root = fileURLToPath(new URL("..", import.meta.url));
const outDir = join(root, "harness-dist");
mkdirSync(outDir, { recursive: true });

await esbuild.build({
	entryPoints: [join(root, "scripts/harness/main.ts")],
	bundle: true,
	format: "iife",
	target: "es2021",
	sourcemap: false,
	outfile: join(outDir, "bundle.js"),
	logLevel: "warning",
});
copyFileSync(join(root, "scripts/harness/index.html"), join(outDir, "index.html"));
console.log(`Harness written to ${outDir} (open index.html in a WebGL2 browser)`);
