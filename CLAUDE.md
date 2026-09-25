# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A standalone Electron + Three.js 3D adventure game (plain ES modules, no bundler, no TypeScript, no lint step). The playable prologue is a road through four regions of the continent Azhora; a branching civil-war campaign exists as a tested state machine but is not yet playable in 3D. The README is long and current: its "Code and validation" table maps every `src/` module to its responsibility, and `docs/` holds the design briefs (`campaign-design.md`, `region-rebuild.md`, `content-pass.md`). Read those before changing story, regions or quests.

Lore comes from the sibling repo `../world-builder/azhora_lore`. The authored world map lives at `../world-builder/map/resources/examples/azhora.wwmap`; this project only ever reads it.

## Commands

```sh
npm start                      # launch the game (or double-click "Play Azhora.cmd")
npm test                       # Node test suite, ~280 tests, ~75 s, no Electron needed
node --test tests/campaign.test.js                                   # one file
node --test --test-name-pattern="double-dealing" tests/campaign.test.js   # one test
```

`npm test` enumerates test files explicitly in `package.json` and runs them in one process (`--test-isolation=none`). A new `tests/*.test.js` file does not run until it is added to that list.

There is no local `node_modules`; `scripts/launch.cjs` falls back to the Electron install in `../world-builder/map/node_modules`. `npm install` here only if that ever breaks.

### Electron smoke tests

These drive the real renderer in an offscreen window. Run them one at a time; each takes from under a minute to several minutes (`test:autoplay` walks the whole road at real speed).

| Command | Checks |
| --- | --- |
| `npm run test:game` | Full story walkthrough: tutorial, fights, quests, satchel, saves, F8 travel |
| `npm run test:road` | Holds real movement keys along the whole road and back; collision and bounds |
| `npm run test:checkpoints` | Autosaves, WebAudio, Continue in a fresh renderer |
| `npm run test:autoplay` | The autopilot plays the road end to end |
| `npm run test:forest` / `test:hideout` / `test:local-map` / `test:regional-life` / `test:developer` | Optional content, maps, ghost mode; most also reload the page and verify saved state |
| `npm run test:window` | Native fullscreen, F11 / Alt+Enter, Escape |
| `npm run review:*` | Screenshot captures for visual review, same flags |

Results, screenshots and `failure.png` / `failure.json` land in `tests/artifacts/` (gitignored). Smoke runs use an in-memory save slot and a throwaway Chromium profile under `tests/.electron-profiles/`, so they never touch `saves/road-checkpoint.json`.

### Generated assets

- `node scripts/build-region-survey.mjs` regenerates `src/region-survey.js` from `assets/azhora-dev-regions.json`. That file is generated; never hand-edit it. `tests/region-survey.test.js` fails if it drifts.
- After the World Builder map changes, run **both** `npm run map:refresh` (journal parchment chart: `assets/azhora-world-map.svg` + `.json`) and `npm run map:developer` (`assets/azhora-dev-regions.json`, the hex survey). The developer loader rejects mismatched exports.

## Architecture

### Process layout

- `main.cjs` (Electron main): serves the project folder over a loopback HTTP server on a random port, opens one sandboxed `BrowserWindow` with context isolation, and owns the single save slot through `scripts/checkpoint-store.cjs` (validated JSON, atomic temp-file rename, 64 KB cap). It also parses every `--smoke-test --<x>-checks` / `--<x>-review` flag and decides which `window.__AZHORA__` entry point to call.
- `preload.cjs` exposes `window.azhoraRoadStorage`, a `localStorage`-shaped API backed by synchronous IPC. The renderer never sees the filesystem.
- `index.html` loads `src/main.js` as a module with an import map that resolves `three` to `vendor/three.module.js`.

### Renderer composition

`src/main.js` is the composition root and the only file that touches the DOM broadly. It builds the world, creates every subsystem, runs the input and render loop, and holds the top-level `mode` string (`opening`, `arriving`, `playing`, `dialogue`, `fishing`, `pause`, `defeated`, ...). Subsystems are factory functions (`createCombat`, `createJourney`, `createCampaign`, `createInventory`, ...) that return objects with `state()` / `snapshot()` / `restore()`; main.js wires their events to the HUD and to autosave. Keep new systems in that shape so `road-checkpoint.js` can serialize them.

When the page URL carries `?test=1`, main.js attaches `window.__AZHORA__` with `state()`, deterministic `review(view)` camera setups, and the `run*Checks` drivers. The drivers themselves live in `src/*-smoke.js` and receive a hooks object from main.js, so smoke logic stays out of the game loop.

### World geometry pipeline

The playable ground is derived from the authored hex atlas, not drawn by hand:

```
azhora.wwmap  →  scripts/export-developer-atlas.mjs  →  assets/azhora-dev-regions.json (131 regions)
              →  scripts/build-region-survey.mjs     →  src/region-survey.js (4 playable regions + nearby land)
              →  src/region-layout.js   pure geometry: HEX_WORLD_TRANSFORM, regionCells/Outline, routeAnchors, worldBoundsFor
              →  src/region-world.js    concrete constants: ANCHORS, WORLD_BOUNDS, MAIN_ROAD, regions, regionAt
              →  src/regions.js         re-exports the above under the names older modules use
              →  src/world.js           Three.js scene: terrain (world-terrain.js), per-region scenery (world-regions.js), props, colliders, paths
```

World units are metres, one authored hex is 56 m, world -Z is atlas north and +X is east (`HEX_WORLD_TRANSFORM`). Region ids are 1 Drent, 2 Luscia, 3 Moros Plain, 4 East Suval. `game-state.js` owns collision (`canStand`, `moveCharacter`) against `world.colliders` and `world.heightAt`. The autopilot follows `world.paths[0]`, which must remain the main road.

The four regions are built (`docs/region-rebuild.md` is the brief, `docs/region-rebuild-report.md` the build report). A few old district names (Sunmeadow, Reedwater, Threefold) survive as landmark titles. The game is titled **Azhora** with the subtitle **An Adventure Game** (window, opening screen, desktop shortcut, package); Eastreena is at most a side name for the opening village (Tidehaven): never use it for Drent, the woods, the old first district, the prologue or the game. Pre-rebuild versions of the rewritten files are in git history (the initial commit), not in the tree.

### Story and campaign layers

- Tutorial stages 0 to 10: `questSteps` / `advanceQuest` in `game-state.js`.
- Road quests and NPC dialogue: `journey.js` and `journey-content.js`. Dialogue is arrays of lines using the `tangent(...)` / `choice(...)` helpers; match that shape and register.
- Optional content: `forest-story.js`, `forest-hideout.js`, `regional-life.js`, `acorn-quest.js`, each with exactly-once rewards.
- Campaign: `campaign-world.js` is the region registry (difficulty levels 0 to 5, factions, threats, transcript name aliases); `campaign.js` is the chapter graph with the Empire / Coalition fork, battles, regional arcs, trust and exposure, and validated snapshots. `docs/campaign-design.md` is the design record and the tests check the two agree. Do not change the state machine's rules from content work; add triggers and text that advance it.
- Any chapter made playable must also be completable by `autopilot.js` (`planGoal`), and `autoplay-smoke.js` should assert the new chapter is reached.

### Tests

Node's built-in `node:test` with `node:assert/strict`. Pure modules are imported directly from `../src/`. Modules that import `three` (`world.js`, `characters.js`, scenes) cannot be imported bare in Node; load them with `sourceModule()` from `tests/module-loader.js`, which rewrites `three` and relative specifiers into `data:` URLs. Test names are full sentences describing the rule being checked.

### Saves

One slot, key `azhora-road-checkpoint-v1`, version 1. Older version-1 saves must keep loading: missing sections start from defaults, and restored state never re-grants items or rewards. `road-checkpoint.js` validates before applying; invalid data leaves the running game untouched.

## Conventions and gotchas

- Characters are hatless unless the user explicitly requests a hat. Occupations, roles, and model presets must not add headwear automatically; preserve explicit user-requested exceptions. See `docs/design-answers.md` (2026-09-25).
- `.gitattributes` sets `* -text`: files are stored byte for byte. `src/main.js`, `index.html` and `src/campaign.js` are CRLF; most other files are LF. Preserve whatever a file already uses.
- Large heredocs fail in Git Bash on this machine. Write a script to a file and run it instead.
- `src/main.js` and several modules use very long, dense lines on purpose. Do not reformat surrounding code when editing.
- Never write to the World Builder repo; the export scripts are read-only imports.
- Content rules from `docs/content-pass.md`: use authored atlas names from `campaign-world.js`; the Legion speaks in orders and calls republicans rebels while Luscians and Suvali speak plainly; Legion soldiers are men by default; there is no South Pyros.
