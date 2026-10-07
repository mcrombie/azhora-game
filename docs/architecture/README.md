# Azhora codebase guide

Azhora is a JavaScript game running in a browser inside Electron. This guide explains where features live, how they connect, and which architectural work is still ahead. The October 6, 2026 cleanup organized existing code without changing gameplay or implementing the proposed autonomous campaign simulation.

Start with the folder table, then follow [the conquest of Solis](chapter-one-walkthrough.md). Use the [source index](source-index.md) to find a familiar filename. The [move manifest](source-moves.json) records every old and new source path.

## Independent simulation development

The [five-region Lizeem test](lizeem-simulation.md) is the first independent campaign loop. Run `npm run start:lizeem` or double-click **Test Lizeem War.cmd**. It uses the existing atlas, starts without 3D scenery, and compares an untouched civil war with interventions. A small 3D hero encounter can now affect a local battle; it loads only when joined. Start with [scenario data](../../src/content/scenarios/lizeem.js), then [the engine](../../src/simulation/campaign.js). It does not replace the existing adventure. `npm run start:lizeem-world` connects the scenario to physical exploration, the M map and a separate combined save. See the [world-test walkthrough](lizeem-simulation.md#explore-inside-the-five-region-war).

## Exploration development

The separate [exploration starting point](exploration.md) is the current place to test movement, camera, map discovery and basic saving without the old quest or skill controllers. Run `npm run start:exploration` or double-click `Explore Azhora.cmd`. The original game remains available with `npm run start:adventure`. `npm start` opens the shared three-mode menu. The [Hearthfall sandbox](hearthfall-sandbox.md) loads Feradom only and reserves an isolated local integration seam for the replacement settlement PR. The linked audit records the world builder dependencies that still need separation.

## Where things live

| Location | Responsibility | Starting point |
| --- | --- | --- |
| `src/app/` | Startup choices, game mode, save validation and migration | [startup](../../src/app/startup/startup.js), [save validation](../../src/app/saves/road-checkpoint.js) |
| `src/content/chapters/` | Authored main story, objectives and encounters | [Chapter 1](../../src/content/chapters/chapter-one/chapter-one.js) |
| `src/content/quests/` | Particular side quests, named characters and their local scenery | [Kayla](../../src/content/quests/kayla/kayla.js) |
| `src/content/regions/` | Actual settlements, terrain adjustments, residents and wildlife, grouped by place | [Solis and West Suval](../../src/content/regions/solis/west-suval-world.js) |
| `src/content/characters/` | Shared authored character definitions and cast | [playable characters](../../src/content/characters/player-characters.js) |
| `src/gameplay/` | Reusable combat, movement, inventory, skills, company and quest behavior | [combat](../../src/gameplay/combat/combat.js), [skills](../../src/gameplay/skills/skills.js) |
| `src/world/` | Terrain machinery, collision, loading, scenery helpers and environment | [region loading](../../src/world/loading/region-loading.js) |
| `src/ui/` | Maps, journal, dialogue controls, skill panels and interface styles | [ordinary M map](../../src/ui/map/world-map.js) |
| `src/dev/` | Developer controls and native runtime verification | [Chapter 1 checks](../../src/dev/checks/chapter-one-smoke.js) |
| `src/experiments/` | Integrated but explicitly experimental scenes and systems | [frontier experiment](../../src/experiments/frontier-command/strategic-prototype.js) |
| `src/simulation/` | Independent campaign core; first tested with the five-region Lizeem war | [scope](../../src/simulation/README.md) |
| `tests/` | Node tests, fixtures and native test helpers | [test manifest](../../tests/test-manifest.json) |
| `prototypes/` | Standalone prototypes | [campaign UI](../../prototypes/campaign/ui.js) |
| `assets/`, `vendor/` | Maps, fonts and data; vendored dependencies | [faction roster](../../assets/campaign-factions.json) |
| `scripts/` | Launching, building, exporting and test execution | [path checker](../../scripts/check-source-layout.mjs) |

Three source entry points deliberately retain their original locations:

- [boot.js](../../src/boot.js) chooses loading behavior and imports the game or climate annex.
- [main.js](../../src/main.js) connects systems, interface, the update loop and developer hooks. It remains a large integration module and a future extraction target.
- [world.js](../../src/world.js) assembles the 3D world from authored regions and shared world helpers. It also remains a large integration module.

## How the game starts

`npm start` runs the shared exploration menu through `scripts/launch.cjs --exploration` and `scripts/exploration-desktop.cjs`. For the original adventure, `npm run start:adventure` starts Electron with the root `main.cjs`. That file opens a window and serves `adventure.html` locally. The page loads `src/boot.js`, then `src/main.js`; the latter connects gameplay, content, world construction, UI and persistence.

The package default and public `index.html` open the same three-mode menu. `exploration.html` redirects old bookmarks there, preserving query parameters. Render publishes these through `npm run build:web`; deploying remains manual. The root **`main.cjs` is the original adventure desktop host**; **`src/main.js` is its running game**, not the shared menu controller.

The existing fallback launcher finds Electron in the neighboring World Builder project when there is no local installation. Source reorganization does not change that relationship.

## Reading a feature

Look first for the subject's folder. Existing filenames were retained so search history, design notes and familiar terms remain useful.

A file ending in `-host.js` usually connects state to actors, combat, prompts and saving. A `-view.js` generally draws or presents it. A `-world.js` or `-scenery.js` usually defines places or their construction. These are existing conventions, not guarantees of complete separation.

Kayla's behavior, character model, race and integration files now live together under `content/quests/kayla/`. Runtime smoke checks are in `dev/checks/`; corresponding Node tests remain in `tests/`. Autoplay is an existing player-facing feature, so its reusable route drivers live in `gameplay/autoplay/`, separately from automated checks.

## Where a new change belongs

| Change | Start here |
| --- | --- |
| Adjust general weapon behavior | `gameplay/combat/` |
| Change skill experience | `gameplay/skills/skills.js` |
| Change one teacher's lesson | Its existing `content/quests/` family or skill module |
| Add a city or change a regional landscape | The appropriate `content/regions/` folder |
| Change shared terrain loading or collision | `world/loading/`, `world/terrain/`, or `world/collision/` |
| Change political-map presentation or discovery | `ui/map/` |
| Change Chapter 1's sequence | `content/chapters/chapter-one/`, then its integration in `main.js` |
| Change a saved-state format | Owning feature plus `app/saves/` and checkpoint tests |
| Explore an unproven mechanic | `experiments/` or a standalone `prototypes/` folder |

Some existing modules mix authored content and general mechanics. This cleanup gives each a useful home. Separating those responsibilities is later architectural work.

The integrated [Farmlands of the Lizeem](../region-reviews/lizeem-farmlands-handoff.md) is a larger example: its quest hub, country arcs, people and Taleth live in `content/quests/lizeem-farmlands/`; local farm construction and water systems live with Nethereum, Nesdor, Ovesos and Minora's regional content. General crop rules remain in `gameplay/skills/farming/`, and prices and merchants in `gameplay/inventory/`.

## Current architecture and future boundaries

Existing dependencies still cross folders, and the large entry points still coordinate many features. No circular-dependency cleanup, state redesign, TypeScript conversion or save-schema change was included.

The independent simulation now owns time, armies and territory for the isolated Lizeem test. The hero connection supports either map-only regional journeys or physical exploration position. The world test's Caricas and Ovesos skirmishes share one controller using the existing landscape, hero and camera. Caricas's existing banners and a small guard detail also reflect simulated ownership and stationed strength. Other encounters retain the small isolated arena. Broader diplomacy, actual armies in world scenery and encounter refinement remain future work. The authored campaign remains in `content/chapters/civil-war/`; the independent frontier experiment remains in `experiments/frontier-command/`. Neither has been promoted into the new world engine.

In the original adventure and exploration map, existing Chapter 1 and aftermath records still determine the visible political outcome. The Lizeem test has its own live map adapter and does not modify those records. See [the Solis walkthrough](chapter-one-walkthrough.md) for the current connections.

## Running and checking

Run commands from the project root:

```powershell
npm start
npm run check:layout
npm run check:modules
npm run test:campaign-ui
node scripts/run-tests.cjs tests/chapter-one.test.js tests/campaign-map.test.js tests/road-checkpoint.test.js
node scripts/launch.cjs --smoke-test --chapter-one-checks
```

`node scripts/run-tests.cjs` runs the full explicit suite, isolating each file to release large world fixtures between batches. Native smoke runs use an isolated profile rather than the player's normal save. See [reorganization verification](reorganization.md) for the checks performed during this cleanup.

The project uses native JavaScript modules and an import map for local Three.js. There is no TypeScript compilation step. The surrounding folder name `typescript` does not affect execution. Moving the project directory and migrating the language are separate decisions.

## Keeping this navigable

Keep new files with their feature family. Prefer feature-owned implementation over new inline subsystems in `main.js` and `world.js`. Add links here for major new areas and keep experimental status explicit.

The private manuscript directory is outside the runtime and this index. Its existing confidentiality and read-only rules remain in force.
