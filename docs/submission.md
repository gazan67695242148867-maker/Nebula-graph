# Community plugin submission drafts (Nebula Graph 0.1.0)

Drafts for the Obsidian community directory. Nothing here is submitted automatically.
Check each item against the live template before you open the PR.

## 1. Entry for `community-plugins.json`

Values come from `manifest.json`. Add this object to the end of the array in
`obsidianmd/obsidian-releases` (`community-plugins.json`):

```json
{
	"id": "nebula-graph",
	"name": "Nebula Graph",
	"author": "Gavrilov Dima",
	"description": "Explore your vault as a 3D lattice of luminous notes and links.",
	"repo": "gazan67695242148867-maker/nebula-graph"
}
```

## 2. PR title

```
Add plugin: Nebula Graph
```

## 3. PR body

Paste into the PR description. Compare the checklist with the current pull request
template in `obsidianmd/obsidian-releases`, since the wording there may have changed.

```markdown
## Plugin

- **Name:** Nebula Graph
- **ID:** nebula-graph
- **Repository:** https://github.com/gazan67695242148867-maker/nebula-graph
- **Release:** https://github.com/gazan67695242148867-maker/nebula-graph/releases/tag/0.1.0
- **Description:** Explore your vault as a 3D lattice of luminous notes and links.

Nebula Graph shows the vault as a 3D graph of notes (nodes) and links and shared tags (edges).
It runs entirely on the device, makes no network requests, and does not write to the vault.

## Checklist

- [ ] I have read the developer policies and plugin guidelines. (Tick yourself after reading.)
- [x] The plugin ID is unique, does not contain "obsidian", and does not end in "plugin".
- [x] `manifest.json` has `id`, `name`, `version`, `minAppVersion`, `description`, `author` and `isDesktopOnly`.
- [x] The description is under 250 characters, ends with a period, and does not start with "A plugin that".
- [ ] The GitHub release tag is `0.1.0`, exactly matching `manifest.json` (no leading `v`). (After you tag.)
- [ ] The release attaches `main.js`, `manifest.json` and `styles.css` as separate assets. (After the workflow runs.)
- [x] The repository has a `LICENSE` (MIT) and a `README.md` with install, settings, network use, and privacy sections.
- [x] The plugin does not use `innerHTML` or `outerHTML` with dynamic content.
- [x] The plugin does not make network requests (no `fetch`, no `requestUrl`).
- [x] Views and the WebGL scene are disposed in `onClose`; `dispose()` is idempotent and is also registered with `this.register`.
- [x] `isDesktopOnly` is `true`, and the README explains why.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## 4. Likely review requests, with prepared answers

**a. "Why is `isDesktopOnly` set to true?"**

The 3D view needs WebGL2 and renders a three.js scene. Mobile is not tested for 0.1.0,
and the README "Known limitations" section says so. The flag stays on until mobile is tested.

**b. "The bundle is large. Which third-party code is in `main.js`, and under what license?"**

`main.js` is about 589 KiB and bundles three.js (`three@^0.187.0`, MIT licence; the
upstream notice is in `node_modules/three/LICENSE`). `three` is the only runtime
dependency in `package.json`. The bundle is built with esbuild by `npm run build`.

**c. "Which vault data does the plugin read, and does it write anything?"**

It reads file paths, names, extensions, creation and modification times, resolved
links, and tags, through `app.vault.getFiles()` and `app.metadataCache`
(`src/data/obsidianSnapshot.ts`). It does not read note bodies, and it does not
call any vault write API (`modify`, `create`, `delete`, `rename`, `process`, or
`vault.adapter`). Both claims were checked with grep against `src/` before this
submission. The README "Privacy" section describes the same behaviour.

## 5. Before you open the PR

- Push `main` and the `0.1.0` tag, and confirm the GitHub release has the three assets.
- Confirm `https://github.com/gazan67695242148867-maker/nebula-graph` is public.
- Test with BRAT first (`gazan67695242148867-maker/nebula-graph`).
- Add `docs/demo.gif` if you want one in the README. It is not required for 0.1.0.
