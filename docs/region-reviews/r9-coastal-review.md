# R9: Gala, the Ascarths, Oves and Selemi

Review worktree only. Regions are Gala 22, Northern Ascarth 23, Southern Ascarth
24, Ovesos 25, Oves Desert 26 and Selemi 54. Runtime IDs and city reservations
remain unchanged. This is an environment and integration correction, not a new
settlement or campaign build.

## Confirmed defects

The first production Fast fixture read actual Float32 ground triangles and each
visible trunk's complete bottom footprint. Before correction:

| Authored scenery | Trees | Feet exposed by over 2 cm | Feet buried by over 4 cm | Worst exposed foot |
|---|---:|---:|---:|---:|
| Ascarth | 1,000 | 832 | 43 | 0.788 m |
| Oves | 78 | 58 | 10 | 1.037 m |
| Selemi | 34 | 15 | 10 | 0.288 m |

Gala has another 85 registered trees. The first coarse-only probe reported
12.07 m and 6.64 m gaps at (-1841.317, 1417.046) and
(-1808.567, 1290.270), but omitted Gala's retained Treloss mesh. Those numbers
therefore do **not** prove missing terrain or a Telemonia loading defect. The
archived captures retain tree/instance facts, not the queried ground triangles;
they cannot retrospectively establish that attribution. Native inspection at
the first point finds Treloss ground at 6.787759 m, physical support at
6.793562 m, and the corrected callback at 6.787759 m. None of the 41 loaded
Telemonia ground meshes covers that point. Gala's footing correction includes
its retained Treloss mesh after creation.

The separate Telemonia shared-ground dependency is supported by retained
triangle ownership and the Gala-first/later-Telemonia reuse test below, not by
those two Treloss examples. A distinct native target (-1997.919, 1011.161)
checks the shared Telemonia coverage. Existing mesh geometry remains exact.

All 98 existing wildlife residents spawned. Of their 63 ground residents, 38
displayed bodies differed from visible footing by over 2 cm; the worst were
Ascarth cliff gulls, up to 6.502 m above the coarse rendered cliff.

## Bounded changes

- Existing Gala, Ascarth, Oves and Selemi trees keep their specific species,
  seeded locations, rotations, scale, colour, collider footprints and IDs.
  Whole trees translate vertically until their full leaning six-sided feet are
  embedded about 3 cm. Registry stump height follows the actual trunk foot.
- Gala completes its existing fine gully mesh before seating and registering
  its already-generated trees; no scatter random draw changes.
- `telemonia-ground.js` extracts the existing 1.5 m ground generator, retaining
  its lattice, masks, Float32 heights, independent colour jitter and tile order.
  A ground-only loading job precedes Gala/Oves and Telemonia scenery. The latter
  reuses that lattice; standalone scenery still builds the same ground itself.
- Ground ownership is `[22,25,26,55,57,59]`: the actual fine collar reaches Gala,
  Oves Desert, East Pyros and Legemum; Ovesos shares the Desert's scenery job.
  Region 36 is outside it. Their coarse terrain dependencies load the necessary
  aprons. Loading Drent does not request this job.
- Displayed support takes the highest retained fine/coarse triangle. Fine
  samplers return null outside retained cells, use cached data, and never cast a
  ray through the world per animation frame. Babon's existing branch is retained.
- The six R9 wildlife regions use displayed footing while logical movement,
  water heights, flight heights, animal homes and reservation checks stay intact.
- The two authored Oves vulture ranges now use the existing bone-bird rig.
  Their previous notes explicitly deferred that rig and used turkey-vultures as
  stand-ins. Zone IDs, sites, counts and flight heights remain unchanged.

## Habitat audit

The existing 35 ranges already cover the habitats in this group:

| Area | Ranges / residents | Existing coverage |
|---|---:|---|
| Gala | 10 / 35 | Estuary and distributary birds, dolphins, steppe hares, maquis boar, raptors |
| Ascarths | 10 / 26 | Wooded-hill deer and boar, open-ground hares, cliff colonies, dolphins and sea-plungers |
| Oves | 10 / 23 | Otters, ducks, herons and river foxes in the sole wet gallery; sparse steppe/desert hares and soaring birds |
| Selemi | 5 / 14 | Three headland colonies, sea-plungers and dolphins around the small island |

Sparse drought-year Oves and Selemi interiors are documented choices supported
by their climate/scale, not confirmed missing woodland populations. Rig
availability alone is not a reason to add road foxes or spine lizards. Domestic
stock, new people and settlement content remain outside this review. Aevis and
Nylon reservations, existing walls and natural harbours are preserved.

## Validation

The dedicated `r9-coastal-grounding-review.test.js` captures 1,197 drawn and
registered trees and all 98 residents. The pre-change tree identity hash
(`id,x,z,height,species,log`, sorted by ID so loading order is immaterial) is
`f98a72f5f36892f8eebc0b1797ceb4bd88058e114128ef1ed7a53cd5746a2fbb`.
The scenery hash masks only live-tree Y; all other prop transforms, colours and
static geometry are pinned to
`79e8e9d69831f317f63c320610198cf1dda6345490fbce0bbbae39d0ba234cc6`.

Final scoped regression: **7/7 passed in 42.39 seconds**, explicit process exit 0.
All 1,197 complete root footprints meet visible triangles within the 2.5–3.5 cm
embed allowance, with no exposed or buried feet; eight Gala and four Oves trees
touch fine terrain. All 98 residents remain, and all 63 ground residents' actual
drawn body origins match their displayed footing; no resident is misplaced.
Water and flight heights remain unchanged. Specific log saves, complete own-tree
trunk/crown/collider hide and exact regrowth, and Aevis clearances pass.

The fixture loads Gala first. Its shared ground is ready while Telemonia's walls
and town remain pending. Loading the other coastal countries leaves Gala's tree
heights unchanged; subsequently loading Telemonia reuses exactly the same fine
mesh objects and every coastal tree's original corrected matrix/height.
The extracted standalone Telemonia regression passed 4/4 in 10.25 seconds,
including all 94 rooted trees, stable species/IDs, unchanged metrics and 120
colliders. Every geometry byte, including transforms, vertex colours and indices,
matches the retained full old builder: all meshes
`6596c5e409f4131224a7a4452371810c2681ca1fbd2c4dedfee1fc3adc9f393b`;
fine ground alone
`fb20c3ec49b85d0ab33479dc86fbdf8ae2774568445c2cbf139f84eacffed2a4`.
Native visual journeys and clean-relaunch save checks remain separate gates.

## Frozen integration manifest

- `src/content/regions/ascarth/ascarth-scenery.js`, `src/content/regions/gala/gala-scenery.js`, `src/content/regions/oves/oves-scenery.js`,
  `src/content/regions/selemis/selemis-scenery.js`: bounded rooting and actual stump height.
- `src/content/regions/telemonia/telemonia-ground.js` (new), `src/content/regions/telemonia/telemonia-scenery.js`: shared existing
  ground generator; reuse in the standalone/full scenery builder.
- `src/world.js`: four R9 rendered-ground kit callbacks, shared-ground import/job
  and neighbour support function, Telemonia's `fineGround` input, displayed-ground
  maximum with Gala's retained patch. Preserve unrelated shared-file changes.
- `src/content/regions/western-regions/west-regions-life.js`: append only the six R9 names to visual footing.
- `src/content/regions/oves/oves-wildlife.js`: the two approved bone-bird substitutions and rationale.
- `tests/r9-coastal-grounding-review.test.js` (new, register in manifest),
  `tests/telemonia-geometry-hash.js` (new helper),
  `tests/telemonia-scenery-review.test.js` (append exact extraction test),
  `tests/oves-world.test.js` (one species expectation updated to bone-bird).
  The latter full-world suite was not rerun; the changed population and rig were
  exercised by the scoped R9 test.
- This report. Ignored capture artifacts are evidence only, not runtime inputs.

Useful native inspection targets: the Gala Treloss and Telemonia sites above;
Ascarth's former exposed tree at (-1438.794, 1520.072) and west-cliff gull colony
around (-1546, 1572); Oveth gallery around (-1967.099, 842.847); Selemi's leaning
tree at (-805.509, 2481.702). These are look-at targets, not new travel spawns.

## Native strand-wrack correction

The later Full view `regional-ground-full-selemis-hollow.jpg` showed 72 evenly
spaced, rounded brown clumps tracing the harbour like a necklace. The bounded
correction changes only `Strand wrack`: 122 thin curled weed fragments now form
nine separated patches, with 4-18 fragments per patch and varied shoreward width.
Original candidate and colour random draws are consumed unchanged before a
separate deterministic patch sequence runs. All downstream cliff rocks retain
their original transforms and colours. Wrack has no new solid colliders.

The local physical-ground fixture passes 2/2 (4.94 s including imports). All 34
tree records, every collider, and all 18 other scenery batches retain exact bytes.
The original full local geometry hash remains
`d100523fc18075d51bf6ad20f374cc192b46c37fb0c09f124a528abdf333d250`
when substituting only the captured original wrack record. The record is a
repository fixture, `tests/fixtures/selemis-wrack-before.json`, and its original
matrices match the archived production R9 fixture exactly. The existing R9
full-layout expected hash also remains unchanged through this explicit one-batch
allowlist. The registered composed-world suite subsequently passes **7/7**
in 41.27 s, explicit runner exit 0. Its original retained-layout hash
`79e8e9d69831f317f63c320610198cf1dda6345490fbce0bbbae39d0ba234cc6`
and tree identity hash remain exact. All 1,197 tree footprints, harvest/save
restoration, 98 residents (63 grounded bodies), and Gala-first then Telemonia
load reuse pass with the wrack replacement on the actual composed world.

New ribbons are under 2.5 cm high in their local geometry and sit 1.0-4.2 cm above
the fixture's strand. A top-view geometry comparison confirms bare sand between
uneven patches. Root owns the subsequent in-game Full/Fast visual recapture.

## Wrack native recapture

The main Celder-composed Fast run captured and inspected `regional-ground-fast-selemis-hollow.jpg`. The shoreline now reads as separate thin weed/debris patches with varied gaps; the regular necklace of rounded brown heaps is gone. The seven-check constructed coastal regression remains green with its original preserved-layout reference. This image closes the specific wrack appearance follow-up, not every remaining coastal journey gate.
