# Hearthfall Feradom sandbox

Hearthfall now has an isolated integration workspace on the current exploration foundation. The three startup choices are **Explore the World**, **Lizeemi War Scenario**, and **Hearthfall Integration**. Each has an independent Continue option and save slot. The old Hearthfall PR has not been merged. Its settlement simulation and chronicle remain work for the replacement PR.

Run `npm start` or **Play Azhora.cmd** for the shared menu. `npm run start:hearthfall` and **Test Hearthfall.cmd** open the same menu; select Hearthfall Integration. The original adventure remains available through `npm run start:adventure`. The independent map-only war test still uses `npm run start:lizeem`.

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

`world` exposes terrain queries, nearby colliders, paths, landmarks, and reindexing for local scenery. Add colliders and landmarks with stable experiment IDs. Track and remove only owned objects. Survey sites against the current terrain instead of assuming coordinates from the old branch still fit. Do not clear authored woods, roads, farms, forts or wildlife to force a placement. Keep actors provisional until their appearance is deliberately specified.

Keep the economy unbalanced if necessary for the first review, but report the observed failure modes. Do not reinterpret Feradom's government or overwrite global factions, quest controllers, existing campaign state, or shared inventory rules to fit the experiment. Share existing movement and renderer code; do not fork a second copy of the game. Propose needed shared-engine changes separately.

## Replacement branch and PR

The intended handoff base is `mcrombie/azhora-game:hearthfall-sandbox-base`. It includes the current exploration and Lizeem foundation in addition to this sandbox. The local branch must be published before a collaborator can fetch it.

Create a fresh branch from that base in the contributor's fork. Bring over useful changes selectively, adapting imports to the current directory layout. Keep PR #1 open as a draft/reference until the replacement exists. The new PR initially targets `hearthfall-sandbox-base` in `mcrombie/azhora-game`, so its diff contains the settlement port rather than the foundation. Retarget to `main` after the foundation lands there.

While the base remains separate, periodically merge updates from `upstream/hearthfall-sandbox-base` into the new feature branch. Once it lands on main, use `upstream/main`. Do not merge the old integration branch wholesale or rewrite its history.

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
