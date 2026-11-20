# Nebula Graph

Nebula Graph shows your vault as a three-dimensional lattice: each note is a glowing sphere, and links and shared tags are thin lines between them. Notes in the same folder share a colour, and the view orbits, zooms, and fits to the whole vault. It runs entirely on your device.

<!-- TODO: add docs/demo.gif -->

## Features

- **3D graph of your vault.** Every file in the vault is a node. Node size grows with the number of connections.
- **Links and tags as edges.** Explicit `[[links]]` appear as solid lines, and notes that share a tag are joined by fainter ones.
- **Orbit and zoom.** Drag to orbit, scroll to zoom. Zoom follows the cursor, and the camera stops at a sensible distance.
- **Light and dark.** The palette follows your Obsidian theme when the view opens.
- **One command.** Open the view with **Open graph view** in the command palette.

Not in this version: search, clicking a node to open its note, a ribbon icon, and live theme switching (reopen the view after changing theme). These are planned.

## Installation

### From the community plugin directory

Once the plugin is listed, go to **Settings → Community plugins → Browse**, search for "Nebula Graph", select **Install**, then **Enable**.

### With BRAT (beta testing)

1. Install the **BRAT** plugin from the community directory and enable it.
2. Open **Settings → BRAT → Add beta plugin**.
3. Enter `gazan67695242148867-maker/nebula-graph` and select **Add plugin**.
4. Enable **Nebula Graph** under **Settings → Community plugins**.

### Manual install

1. Download `main.js`, `manifest.json` and `styles.css` from the [latest release](https://github.com/gazan67695242148867-maker/nebula-graph/releases/latest).
2. Create the folder `<your vault>/.obsidian/plugins/nebula-graph/` and copy the three files into it.
3. Reload Obsidian, then enable **Nebula Graph** under **Settings → Community plugins**.

## Settings

Nebula Graph has no settings in this version.

## Network use

Nebula Graph makes **no network requests**. It does not download models, fetch data, check for updates, or send telemetry. Everything it needs ships in `main.js`.

## Privacy

All processing is local. The plugin reads each file's path, name, dates, links and tags from Obsidian's metadata cache, builds the graph in memory, and draws it. It doesn't read the text of your notes, never writes to your vault, and never sends anything off your device. Closing the view releases its memory.

## Known limitations

- **Desktop only.** The 3D view needs WebGL2 and is too heavy for mobile in this version.
- **Performance depends on your GPU.** Large vaults (10,000+ notes) may render slowly on integrated graphics.
- **Layout is a placeholder.** Notes are placed on a sphere in folder order until the physics layout ships.
- **No search or note opening yet** (see Features).

## Development

Requirements: Node.js 20 or later, and npm.

```bash
npm install
npm run dev                          # watch mode; writes main.js at the repo root
npm run build                        # type-check and production bundle
npm test                             # unit tests (vitest)
npm run lint                         # ESLint with the Obsidian rules
npm run generate                     # synthetic vault in ./dev-vault (200 notes)
npm run generate -- --nodes 10000    # stress-test vault
npm run harness                      # browser harness: harness-dist/index.html
```

### Install into a vault

```bash
node scripts/install.mjs "<path to your vault>"
```

This copies only `main.js`, `manifest.json` and `styles.css` into `<vault>/.obsidian/plugins/nebula-graph/`. It refuses to run on a folder without `.obsidian`, and it never touches any other file.

### Releasing

```bash
npm version patch        # or minor / major
git push && git push --tags
```

`npm version` updates `package.json`, `manifest.json` and `versions.json` together. Push the tag, and the release workflow builds, tests, and publishes a GitHub release with `main.js`, `manifest.json` and `styles.css` as separate assets. The workflow fails if the tag doesn't match the `manifest.json` version, or if the tag has a leading `v`.

## Layout

- `src/main.ts`: plugin lifecycle and the command
- `src/data/`: builds the graph from the vault (pure builder plus Obsidian adapter)
- `src/render3d/`: three.js scene, nodes, edges, and the Obsidian view
- `scripts/`: vault generator, installer, release tooling, browser harness

## License

MIT. See [LICENSE](LICENSE).
