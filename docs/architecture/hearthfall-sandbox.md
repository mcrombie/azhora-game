# Hearthfall Feradom sandbox

Hearthfall now has an isolated integration workspace on the current exploration foundation. The three startup choices are **Explore the World**, **Lizeemi War Scenario**, and **Hearthfall Integration**. Each has an independent Continue option and save slot. The old Hearthfall PR has not been merged. Its settlement simulation and chronicle remain work for the replacement PR.

Run `npm start` or **Play Azhora.cmd** for the shared menu. `npm run start:hearthfall` and **Test Hearthfall.cmd** open the same menu; select Hearthfall Integration. The original adventure remains available through `npm run start:adventure`. The independent map-only war test still uses `npm run start:lizeem`.

The shared menu is also the package default (`electron .`) and the public `index.html`. `npm run build:web` includes it in the Render artifact; `exploration.html` preserves older bookmarks by redirecting to the main entry. The original adventure is preserved at `adventure.html`. Render deployment remains manual. Browser saves use localStorage on that site's origin and do not automatically transfer from desktop saves.

## What this base supplies

- Current shared 3D movement, camera, terrain, map, and developer mounts.
- Feradom only: region 21 is passed to the world builder as `enabledRegions`. Other region jobs are not registered. Walking, swimming, horse travel, flight, direct preparation, and developer destinations respect the boundary.
- A versioned local save at `saves/hearthfall/road-checkpoint.json`, under key `azhora-hearthfall-v1`. Electron rejects writes to other mode slots from this mode. Browser fallback uses a distinct localStorage key; it is organizational separation, not a security boundary against arbitrary same-origin JavaScript.
- An explicit lifecycle seam in `src/experiments/hearthfall/session.js`, loaded only when Hearthfall starts. No cloud client, authentication, generation endpoint, deployment stack, or settlement service has been adopted.
- Existing exploration saves remain readable. New snapshots name the hero Teresod, using the current shared exploration avatar. Explore the World starts with the full atlas revealed; that does not eagerly build every region.

The shared world assembly still imports wider geography and some legacy scenery helpers. The sandbox limits regional construction and travel; it is not yet a fully extracted regional asset bundle. The existing authored Feradom terrain and farms remain intact. Opening progress may mention shared assembly stages for other regions even though their regional jobs are excluded.

## Porting the settlement pilot

Keep experimental rules and views in `src/experiments/hearthfall/`. The initial scope is the local Feradom pilot from PR #1: deterministic settlement state, resident needs and resources, player assistance, and a factual local chronicle. Preserve provenance to that PR and its commits. Do not transplant the old flat `src/main.js`, startup, preload, or checkpoint integrations.

The session factory receives `{saved, scene, world, player, onDirty}`. It returns:

| Method | Responsibility |
| --- | --- |
| `tick(dt, elapsed)` | Advance only while the host is playing; paused menus do not advance the simulation |
| `save(exploration)` | Produce the combined Hearthfall checkpoint, without writing storage directly |
| `restore(data)` | Restore this mode's state when the user loads its checkpoint |
| `state()` | Return an inspectable copy for tests |
| `dispose()` | Release owned actors, UI, listeners, timers and scenery |

The current `sandbox` payload is `{version: 1, seed: 980, settlements: null}`. This deliberately signifies an uninstalled pilot. Add an explicit migration and validation when introducing settlement state. Preserve unknown/future saves instead of silently resetting them. Add local chronicle persistence under a Hearthfall-specific directory/key; any new desktop IPC must be narrow and separately reviewed.

`world` exposes terrain queries, nearby colliders, paths, landmarks, and reindexing for local scenery. Add colliders and landmarks with stable experiment IDs. Track and remove only owned objects. Survey sites against the current terrain instead of assuming coordinates from the old branch still fit. Do not clear shared authored woods, roads, farms, forts or wildlife to force a placement. The author now proposes a year-zero Hearthfall experiment with an initially unsettled Feradom, no other resident intelligent races, and human settlement emerging through the simulation. This historical setup is not implemented by the scaffold: its existing farms and forts are still present. If the pilot suppresses or replaces present-day settlements, do so through a Hearthfall-only scene configuration, with tests that ordinary exploration remains unchanged. Preserve natural terrain and wildlife. Year zero belongs to this experiment, not the global campaign clock; the planned main story is around year 975, while the older prototype uses 980. Keep actors provisional until their appearance is deliberately specified.

Keep the economy unbalanced if necessary for the first review, but report the observed failure modes. Do not reinterpret Feradom's government or overwrite global factions, quest controllers, existing campaign state, or shared inventory rules to fit the experiment. Share existing movement and renderer code; do not fork a second copy of the game. Propose needed shared-engine changes separately.

## Replacement branch and PR

The shared exploration, Lizeem and Hearthfall foundation now lives on `mcrombie/azhora-game:main`. The earlier `hearthfall-sandbox-base` is retained as a reference and is an ancestor of main.

Create a fresh branch from `upstream/main` in the contributor's fork. Bring over useful changes selectively, adapting imports to the current directory layout. Keep PR #1 open as a draft/reference until the replacement exists. The replacement draft PR should target `main` in `mcrombie/azhora-game`; it should contain only the new settlement port. A feature branch already based on `hearthfall-sandbox-base` can merge `upstream/main` and retarget its PR.

Periodically commit local work, fetch upstream, and merge `upstream/main` into the new feature branch. Do not merge the old integration branch wholesale or rewrite its history.

## Acceptance checks

Run:

```powershell
npm run check:layout
npm run check:modules
npm run test:hearthfall
npm run test:hearthfall:desktop
npm run test:exploration
npm run test:lizeem-world
```

For the replacement PR, include desktop verification of all three menu choices, the Feradom boundary including turbo flight, independent save/load/continue, deterministic simulation replay, and the same seed over a longer unattended run. Document balance problems. Include a few screenshots and measured startup/frame observations. Opening Hearthfall must not contact a remote service or load the war/adventure controllers. Continue to enforce the repository's private-manuscript protections.

The foundation's native check writes screenshots and a report under ignored `tests/artifacts/hearthfall-*`. It checks the real Electron renderer and storage bridge, not only mocks. Test profiles and test saves are isolated from player saves.

## Foundation verification on 7 October 2026

The Hearthfall native test passed 24 checks, including the real three-mode menu, only Feradom build jobs, turbo-flight confinement, forbidden cross-mode writes, and Continue in a fresh renderer. The exploration desktop test passed movement, full atlas, developer travel/mounts and save/reload checks. The focused Hearthfall, exploration, Lizeem world and independent campaign model suites passed 107 tests. Source layout and module graph checks passed. The menu and Feradom world view were visually inspected.

The full existing Lizeem world desktop regression is not recorded as passed: two stale presentation assertions were updated to the current report/objective wording; a subsequent rerun stalled during wider terrain preparation and was stopped. Earlier runs verified war startup, map knowledge, timing, region travel, save isolation and entering combat before those presentation assertions. War runtime behavior was not changed as part of the sandbox handoff. This remains follow-up work on the shared foundation, not a requirement to fold terrain optimization into the settlement port.

The public-entry follow-up passed 16 checks against the actual static build, without a preload bridge: root menu, old-link redirect, Feradom-only construction, correct arrival heading, browser save/exit/Continue, build exclusions, and no remote requests or console errors. The desktop Hearthfall regression passed its 24 checks again. The built menu and Feradom arrival were visually checked (`tests/artifacts/web-main-menu.png` and `web-feradom.png`). Layout and module graph checks passed.

The additional focused model run passed 66 of 68 checks. Two existing legacy shield-guard source-extraction tests fail against unchanged `src/main.js`: one fixture omits `suspended`; the other assumes an older playing-branch shape. The only shield-test edit here points its HTML read to the preserved adventure page. Broad legacy opening/garden suites that construct the full world were stopped during initialization; they are not recorded as passing. The original adventure HTML is preserved byte-for-byte.
