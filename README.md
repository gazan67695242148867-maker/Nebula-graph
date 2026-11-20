# Nebula Graph

An Obsidian plugin that shows your vault as a 3D "Aurora Lattice": luminous glass nodes,
fat-line links, and cluster hulls, rendered with three.js on WebGL2.

Status: early development. See the milestone list in the project notes.

## Development

```bash
npm install
npm run dev              # esbuild watch, writes main.js at the repo root
npm run generate         # synthetic vault in ./dev-vault (200 notes)
npm run generate -- --nodes 10000   # stress vault
npm run dev-vault:link   # junction: dev-vault/.obsidian/plugins/nebula-graph -> repo root
npm test                 # vitest
npm run build            # type-check and production bundle
npm run lint
```

Open `./dev-vault` as a vault in Obsidian, then enable **Settings → Community plugins → Nebula Graph**.
`dev-vault/` is throwaway and gitignored. `npm run generate` refuses to write into any directory
it did not create.

## Layout

- `src/main.ts`: plugin lifecycle only
- `src/types.ts`: `GraphData`, `GraphNode`, `GraphEdge`
- `src/data/`: building `GraphData` from the vault (milestone 1)
- `src/render3d/`: three.js scene, nodes, edges, controls (milestone 2)
- `scripts/`: dev tooling (vault generator, dev-vault linking)
