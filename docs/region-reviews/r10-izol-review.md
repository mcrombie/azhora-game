# R10: West Izol boundary and walking correction

2026-10-04. Review checkout: `C:/Users/Michael/Programs/typescript/azhora-game-region-review`, branch `codex/region-review-2026-10-04`, base `13448f7` plus the jointly reviewed changes. This is a frozen, uncommitted correction for West Izol (runtime ID 8), not acceptance of every R10 country. No changes were made in Claude's East Izol checkout or World Builder.

## Reproduced defects

The initial analytic R10 survey covered 1,184 atlas edges, including internal edges, with 22,093 land samples. It flags possible discontinuities; it does not establish that every flagged cliff or water interface needs repair. The remaining mainland candidates are assigned a separate classification review.

West Izol's seven-hex base blend changed its sample set at hex edges. At the eastern handoff corner `(399.998072,1876.520861)`, ground height varied by 3.4845 m across a 2 mm neighborhood. The second corner `(399.998072,1818.785834)` varied by 0.3245 m. The Kelvath path had a 1.7739 m drop across an ordinary 0.14 m walking step. The Hearth Road and camp spur also triggered falling during ordinary travel.

The Sea Gate path had a separate harbor support defect. At `(87.673234,1727.261315)`, physical shore was 4.8986 m high but `world.heightAt` unconditionally selected the east mole's 2.9 m deck. The production controller walked below the shore and repeatedly entered falling on its return. In the corrected baseline driver, outward travel fell from 5.2844 m to the 2.9 m deck; the return was incomplete after 21 fall starts. No damage immunity, mount, climbing or flight was used.

The baseline used actual Fast-loaded region scenery, the `bodyWorld` walking adapter, `world.supportAt`, ordinary slope/undergrowth checks, `createTerrainFall`, the normal falling collision filter and the closed-frontier guard. An earlier diagnostic used a less faithful surface adapter and missed the detached instance batches. Its artifacts remain separately named `r10-izol-first-driver*`; the final evidence uses the corrected driver and actual scene-wide batches.

## Correction and preserved contracts

- `src/izol-ground.js` derives the island's 84 unique atlas edges. It uses the existing continuous terrain blend within 6 m of an edge and fades to the original blend by 24 m. Bucket lookup and an island bounding box keep unrelated terrain calls inexpensive.
- `src/world-terrain.js` applies that bounded inland correction before the existing beach and settlement-pad rules. It also exposes the original island height for legacy scatter decisions. Global terrain blending, atlas ownership, rivers and other regional terrain layers are unchanged.
- `src/izol-scenery.js` keeps original height-based candidate eligibility and color choices, preserving every subsequent random draw. Actual drawing heights follow the corrected ground.
- Three narrow `src/world.js` edits import that legacy sampler, pass it to the Izol kit and select `max(izolDeck, groundHeight)` at the harbor contact. Mole footprints, deck levels, ships and harbor geometry are unchanged.

All 35 island scatter batches, 5,934 instances and 118 registered stone pines retain exact non-height data. Instance hash: `137e22c15b058bbdc2e252c987b7bf9e7d20afcebedd826f9e89d68534bf69e8`. Tree ID/position/height/species hash: `d2125bf1971885c9a5fe3cbf7b074813124a9dff271b7194a7fcbacae9112cf3`. Saved tree identities do not require migration. This hash check does not substitute for a save/reload run or a rendered-root-footprint audit.

The correction is zero at every existing regional hex center and around the locked East Suval frontier. The existing western river-profile and pool-level hashes remain exact. Settlement pads, existing roads, reserved places, harbor objects, faction/story state and East Suval's entry prohibition retain their original definitions.

## Final checks

Run each file in its own process with `node --test --test-isolation=none`:

| File | Result | Evidence |
| --- | --- | --- |
| `tests/izol-seams-review.test.js` | 3/3, 4.92 s | 2,436 two-sided samples across all 84 island edges; largest 1 mm difference 0.000766 m; original corners converge; other-country centers, western water profiles and closed East Suval frontier retained. |
| `tests/izol-traversal-review.test.js` | 7/7, 8.92 s | All five authored paths walked outward and back with actual static colliders and production support/falling controls; zero falls, damage or wet steps. Harbor shore/deck contact and original scatter identities checked. |
| `tests/izol-world.test.js` | 9/9, 8.46 s | Existing atlas, terrace, harbor, town/stands, camp, country paths, map/discovery, faction and scatter tests. Fixture now uses actual scoped region 8; its obsolete global max-X interval is replaced with island containment. |

Both constructed checks exited explicitly 0. Approximate distance each way: Hearth Road 473 m, camp spur 83 m, Ardveth 97 m, Sea Gate 84 m and Kelvath 168 m. No unlimited stamina or special traversal mode is involved; these are ordinary walking routes. No dynamic NPC obstruction or native player-input claim is made by the Node fixture.

Artifacts in this review checkout's ignored `tests/artifacts/`:

- `r10-boundary-screen.mjs/.json`: wider analytic candidates awaiting classification.
- `r10-izol-baseline.mjs/.log`, `r10-izol-baseline-routes.json`, `r10-izol-baseline-scene.json.gz`: corrected, unchanged-source baseline, process session 61072, explicit exit 0.
- `r10-izol-seams-review.log`, `r10-izol-traversal-review.log`, `r10-izol-world-review.log`: final checks above.
- `r10-izol-source-manifest.json`: frozen source/test leaf hashes and shared-edit description.

The first diagnostic overlapped an independently launched full-world registry fixture. These durations are test records, not paired startup or performance benchmarks. No Electron launch was made for this correction.

## Remaining review

Final native player-height views, rendered ground/contact review and integration checks remain required before environmental acceptance. Useful views are the Sea Gate shore/mole contact around `(88,1727)`, Kelvath's corrected path near `(150,1782)`, and the eastern corners near `(400,1819)` and `(400,1877)`.

Claude's frozen East Izol checkout at `fdc1707728128a3cdb29dfac6f8e5be6190dc830` was inspected read-only. Its layer already removes the Hearth-road step but leaves the West island corner and Kelvath defects. The West correction extends at most 24 m across its outer edges; recheck that narrow adjoining ground when East Izol is integrated. No East Izol interior terrain was duplicated or redesigned here.
