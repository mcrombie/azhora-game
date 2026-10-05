# Alezhor frozen delivery intake — 4 October 2026

**Historical initial intake.** This read-only inspection preceded integration
and acceptance. The corrected Alezhor environment is now accepted in MAIN; see
the [integration review](alezhor-integration-review.md) for the final bank,
Full/Fast and Continue evidence. The original intake findings below remain
attributed to that earlier inspection.
No new world fixture, native process, game edit or change in any Claude checkout was made.
The delivered checkout was clean before and after inspection.

## Exact revision and packet

Checkout: `C:/Users/Michael/Programs/typescript/azhora-game-alezhor`, branch `alezhor`.

| Role | Commit |
| --- | --- |
| Exclusive base, East Izol delivery | `fdc1707728128a3cdb29dfac6f8e5be6190dc830` |
| Alezhor build | `c042e8680f2ba99e3fdf008116d09423c665feab` |
| Handoff and revised falls view | `67719d9f245b5322a9cb4808bf552108e8579089` |
| Frozen head, stricter route screen | `116799eb0b6985c8538192289e07929a6cb4fea7` |

The review worktree's `tests/artifacts/alezhor-intake-116799e/` contains:

- `alezhor-region.patch`: exact binary/full-index base-to-head delta, excluding only the generic walker;
  25 paths, SHA256 `4a15291036a5f9bcc19d6f575dac749af8a8d5440da01751e711526cbefdf653`.
- `walker-screen.patch`: only `scripts/walk-route.mjs`, kept separate from region integration;
  SHA256 `294399edec7e64bd7588680e8380ea02ef3209bf1e00c671c5d23fb5e28a4376`.
- `shared-hooks.patch`: the 17 existing-file region changes for selective inspection, **a subset** of
  the region patch, not a second patch to apply after it.
- `leaf-files/`: byte-exact copies of the eight new files; no existing shared file is copied over.
- `manifest.json`: all 26 paths, base/head Git blob IDs, content SHA256, capture hashes and patch hashes;
  SHA256 `01abeaf5479153f5b8d408ea3794fe581a60471475616a5d939c290d01c0c5c8`.

These ignored artifacts are reproducible from the pinned commits. They were prepared, not applied.
The eight new leaves are the three `src/alezhor-{world,scenery,wildlife}.js` modules, two
`tests/alezhor-{world,life}.test.js` suites, `docs/alezhor-brief.md`, the handoff and route JSON.
The packet excludes all ancestor Celder/East Izol diffs, but still depends on their registrations.

## Scope and integration contract

The delivery registers provisional runtime ID 64 after East Izol 63, preserving its existing IDs.
It covers 25 atlas cells (13 grassland, 12 plains), all Csb, and the narrow coastal plain south of
the Ibenwood. Arrival is `(-4100,870)`. The intended content is ground, water, vegetation and wildlife.
Two river-mouth flats remain reserved; no settlements, mining works, harbors, roads or civilians are added.
Reported content is 394 typed harvestable trees, 16,149 instances in 95 batches, and 37 animals in 13 bands.

Shared integration must compose these additions with the review fixes, never replace whole files:

- Registry/survey: generator, generated survey, region layout/world, build status, developer atlas,
  languages and map fog. Retain the all-131 build inventory and the reviewed IDs already allocated.
- Terrain: new outer `alezhorGround` layer, `groundBeforeAlezhor` and tint rows. Retain the reviewed
  legacy placement wrappers, dry seams and every shared fine-ground callback.
- World: two jobs, `alezhor` and `alezhorRiverGround`, both currently owned only by ID 64; map-water
  insertion and public world fields. Both neighboring Ibenwood jobs predate these in the source.
- Wildlife: import/append the 13 zones and add Alezhor to the rendered-footing allowlist without
  dropping the many regions added during review. Trees retain coordinate IDs `alezhor-x-z`.
- Native views: narrowly add Alezhor to the environment dispatcher and its otter review selection.
- Tests: append both files, update the explicit survey/shore/tint/registry expectations deliberately.

The west world bound grows another 50 m and `WINDOW.minQ` becomes -54. The separate coast-distance
lattice grows 22,608 samples; the rendered terrain grows 8,176 vertices. This affects shared terrain sampling and needs composed
geometry/root checks; existing reviewed identity baselines must not simply be replaced.

## Evidence inspected and limits

Read both new test suites, the handoff, source hooks, route JSON and revised walker. The handoff
reports 15/15 world and 13/13 life checks plus neighboring suites; these were not rerun for intake.
The tests meaningfully cover atlas membership, owned ground, live neighbor levels, channel dimensions,
reserved flats, species, clear paths/homes and animal retreat/return. The scenery fixture uses
`groundWithRiver + 0.12`: this proves callback use, not contact with retained rendered triangles.
Tree testing checks the trunk's centerline intersection; complete tilted lower footprints remain untested.

All ten supplied native captures were visually inspected. The overview, dune and cliff views establish
an open coastal strip, forest edge and local tree groups. The estuary shows a visible river-to-sea join
and geese. The close tree-line/bay-head views show some apparently suspended small stones/plant lobes;
these require actual transformed-hull contact measurements before corrections.

`alezhor-gold-falls.png`, `alezhor-gold-estuary.png` and `alezhor-water-bank.png` show sharply white
triangles in sloping ground. The wildlife image shows a horizontal water sheet above exposed-looking
land behind the otter. Treat those as concrete presentation concerns: determine retained triangle,
water and material coverage independently. The handoff's attribution to the shared renderer is not
proof that these are merely lighting, nor does a still prove a collision or physical-water fault.
The falls view was retaken with the handoff's camera edit, so its evidence is newer than the build view.

The stricter walker now follows physical support height, removes the old forced nudge, rejects missed
waypoints, flags drops over 1 m per step and exits nonzero on failure. Its reported 3,317 m walk and
2.2 m swim are screening evidence only. It passes a permissive swimming option to `moveCharacter`,
sets Y directly to ground/water support and does not run stamina, terrain-fall or swimming controllers.
Its drop heuristic also does not prove safety on a long steep descent made of smaller steps. No native
keyboard traversal, continuous controller journey or save/Continue cycle has been demonstrated.

Both startup JSON files exist and report Full mode with zero recorded errors. Their `totalMs` values
match the handoff: base 134.015 s cold / 104.991 s warm; delivery 133.155 s / 105.727 s. Alezhor's labeled
stage is 1.207 s cold / 1.342 s warm. These are one builder-supplied pair, not a review performance pass;
Fast mode, final composed responsiveness, frame times, memory and draw calls remain unmeasured.

## Priority concerns for the later review

1. **River refinement and load order.** Scenery uses coarse `treeGroundAt` before
   `alezhorRiverGround` alters visible terrain. The public rendered-ground callback also remains
   coarse there. More seriously, the reused Ibenwood refiner skips an entire mesh already marked
   `ibenwoodRiverRefined`, even if a later river needs different retained faces in that tile.
   The gold/west reaches meet existing Ibenwood reaches, so test Alezhor-first and Ibenwood-first
   actual retained coverage and reuse. This source-level risk needs a scoped mesh reproduction;
   do not paper it over by lowering plants or blindly importing the old coarse callback.
2. **Water and support.** Independently compare ribbon triangles, water colliders, `waterAt`, physical
   bed and visible bed through falls, ford, estuary and west mouth. Confirm shared owner regions and
   coarse apron, including neighbor-first Fast arrivals. Preserve existing Ibenwood river geometry.
3. **Border traversal.** The test samples every 0.5 m *along* edges but only 0.1 m *across* them,
   allowing 1.05 m at the South Ibenwood corner. The handoff separately measures a 1.02 m cross-edge
   step at `(-3950.3,866.0)` and 1.11 m at the Ganesh bluff `(-3612.9,1191.2)` over 0.5 m.
   Classify water/authored cliff versus dry route, then use real bidirectional support/fall controllers.
   Repeat against the reviewed R4 terrain; no global smoothing or moving the neighbor's river.
4. **Actual scenery/ecology.** Measure every trunk ring, tilted stone/shrub underside and posed animal
   origin against retained triangles; pin original non-Y batches, tree IDs and wildlife logical homes
   before bounded fixes. Inspect otter bank slopes up to 1.4 and normal retreat/return into water.
5. **Acceptance journey.** Full and Fast arrival, the authored trails outward and back, ford/swimming
   with normal stamina/damage, departure/reentry and isolated harvested-tree/inventory save/Continue.

The handoff declares six external lore edits in World Builder and several builder interpretations
(falls, seasonal/coastal water choices, fauna extensions). Those external edits are outside this game
packet; nothing there was edited or reverted during intake. Record their disposition separately under
the user's actual authorization. Cape Heth's proposed language follow-up is also outside this delta.

Next: preserve this frozen packet; complete preceding acceptance work and integrate the required
East Izol base selectively before starting Alezhor's substantive composed review.

## Pure dependency follow-up

The reusable `tests/artifacts/alezhor-intake-116799e/dependency-probe.mjs` confirms that all 226 old
western rendered X samples shift (maximum 0.429185 m), while 903 eastern X samples and every Z sample
remain exact. Extra columns advance terrain color randomness continent-wide. Full tile span also
changes 87 to 88 columns, and Fast's tile origin moves. The coast-distance lattice preserves its phase.

The isolated `stable-terrain-extension.mjs` candidate instead appends eight 6.25 m columns, retains
every old sample and tile footprint, and gives new columns an independent coordinate seed. Its pure
comparison preserves all 1,318,672 old vertex seeds / 1,330,172 draws against the actual production
seed-preparation block; hash `6441a1759c8e8c76e7c3ef32774f2acea59973725e8e40a98d3d19ded940c163`.
No shared production file or existing hash was changed. `dependency-strategy.md` in that artifact
directory records the minimal integration hooks, measured river-refinement omissions and remaining
composed checks. This candidate is not yet an integrated terrain fix or acceptance evidence.
