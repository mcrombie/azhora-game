# Source reorganization record

On October 6, 2026, 710 files moved from the flat `src` directory into feature folders. The existing `boot.js`, `main.js` and `world.js` entry points retained their locations. All original filenames were preserved.

This changes navigation and dependency paths. It does not implement the future campaign simulation, split the large entry points, change gameplay rules, convert JavaScript to TypeScript, or change save formats.

## Changes

The moves were applied in map, interface, application, gameplay, authored content, world, developer and experiment batches. References were updated in source, HTML stylesheets, tests, scripts, prototype imports and design documents. The isolated campaign preview's explicit server allowlist now uses the new map location.

Tests that enumerate source files now recurse into folders. Filename tables and source-reading helpers were updated so their assertions still inspect the intended files. The terrain cache already hashes subdirectories recursively; file moves naturally invalidate its old content signature.

New development commands:

- `npm run check:layout` checks literal local module paths, module-relative resource references and browser entry resources.
- `npm run check:modules` parses and links every runtime JavaScript module, including named imports and exports, without executing the game. It uses Node's experimental VM-module flag only in development tooling.

The [guide](README.md), [Solis walkthrough](chapter-one-walkthrough.md) and [source index](source-index.md) provide the reading path. [source-moves.json](source-moves.json) records the exact mapping.

## Preservation

Before any move, the current working files were backed up under `.tmpchk/source-layout-backup-20261006/`. That local checkpoint includes a ZIP of working files, SHA-256 hashes, the existing Git status and a binary patch of tracked changes. It preserves the uncommitted work that was present before cleanup; it is not based only on HEAD.

The private manuscript, saves, test profiles and generated test artifacts were excluded from the working-file archive. Existing assets and vendored dependencies were not moved. No commit, reset or staging operation was performed.

All 713 original source files were compared with the backup after normalizing the old and new file references. There were zero other differences. The comparison report is `tests/artifacts/reorganization-source-equivalence.json`.

The move manifest and local batch log (`.tmpchk/source-layout-applied.json`) allow reversal. Restore from the checkpoint deliberately rather than extracting it over a later working tree: subsequent edits must be preserved, and new destination files must be handled along with their original paths.

## Verification

| Check | Result |
| --- | --- |
| Pre-move focused baseline | All six selected test files passed |
| Literal source and entry paths | Passed across 1,263 modules and 5,667 local references |
| Static module graph | All 690 game modules and two vendored Three.js modules linked |
| Post-move focused regression set | 180 of 181 assertions passed across 23 test files; the failure also occurs in the untouched backup |
| Recursive birding source audit | Three selected checks passed; the unrelated full-world construction check was stopped separately |
| Native Chapter 1 | 72 assertions passed: both branches, conquest, discovery limits and save/Continue; process exited successfully |
| Native climate annex | 23 assertions passed, including movement, interaction, reset, leaving and returning to the normal game menu |
| Standalone campaign map | 42 native UI checks passed after the map move and server allowlist update |
| Static web export | Succeeded in the isolated `.tmpchk/reorganized-web/` output directory |
| Source equivalence | All 713 original files differ only in file references |

The Chapter 1 Electron run still emitted a GPU shutdown diagnostic after reporting success. No frame errors were reported by its game checks. This cleanup did not change GPU handling.

The full 501-file suite was attempted but is not claimed as passing. It completed 17 files, with a wildlife-footing failure, then made no further progress in `autopilot.test.js` for several minutes and was stopped. The pre-move backup reproduced the wildlife failure and also did not finish the autoplay file within a separate 90-second limit.

Two failures were confirmed independently in the untouched pre-move source:

- `wildlife-loading.test.js`: the check that older wildlife retains its existing footing.
- `held-battles.test.js`: the check rejecting authored encounter levels finds `main.js` in both versions.

Those behavior issues were left unchanged to keep this reorganization mechanical. The full-world setup in `bird-garden-keeper.test.js` was also stopped after a prolonged run; its three relevant source/roster checks were then run separately and passed. The native scenarios provide actual renderer and game coverage, but do not replace every uncompleted terrain or traversal test.

Detailed logs are under `tests/artifacts/reorganization-*.log`. The main native reports are `chapter-one-checks.json` and `climate-annex-checks.json` in that directory. Native checks used isolated profiles and did not overwrite the player's normal save.

## Project location and language

The project remains at `Programs/typescript/azhora-game`. It is JavaScript and has no TypeScript build step. Moving it into `javascript` would be a more accurate organizational label, but the current launcher relies on finding Electron in the neighboring World Builder tree when there is no local install. A root-directory move needs a separate launcher and shortcut check.

No language conversion is required for these folders or the proposed simulation boundary. A neutral games/project directory is also a reasonable future home if the implementation language changes later.
