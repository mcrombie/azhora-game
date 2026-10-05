# R11: starting-country woodland and visible ground

Review checkout: `azhora-game-region-review`, branch
`codex/region-review-2026-10-04`, on 4 October 2026. This bounded pass covers
Drent (1), Luscia (2), Moros Plain (3) and West Suval (5). Native visual and
broader habitat acceptance remain open; this report records the measured root
and loading corrections, not completion of the whole R11 environment review.

## Reproduced defects

The production Fast fixture inspected 3,597 registered trunks against the actual
Float32 terrain, including the Suval switchback ground and limestone skin.
Before correction:

| Country | Reviewed trees | Roots exposed by over 2 cm | Worst exposed root |
| --- | ---: | ---: | ---: |
| Drent | 2,999 | 2,214 | 1.997 m |
| Luscia | 345 | 227 | 1.140 m |
| Moros Plain | 5 | 5 | 0.105 m |
| West Suval | 248 | 189 | 2.129 m |

The five Moros trees are roadside olives from the existing West Suval scenery;
this count does not propose adding woodland to the authored open plain.
The four orange-court trees are included in the West Suval total and preserve
their authored raised bases at 7.8 and 8.1 m.

A separate Fast loading defect left the Luscian part of the Suval hills without
its fine surface until West Suval loaded. At `(-499.083819,597.812487)`, physical
ground was 45.538 m but the only loaded terrain drew at 7.735 m. Loading West
Suval later supplied the correct fine surface at 45.534 m. Thus the roughly
38 m gap in the initial coarse-only probe was a loading omission, not a root
offset in the fully loaded scene. Lowering trees onto that temporary coarse
surface would have buried them after the neighbouring scenery loaded.

## Correction and preserved contracts

`suval-highland-ground.js` now builds the existing three switchback meshes and
limestone skin as a ground-only job shared by the four countries their vertices
actually cross: Luscia, East Suval, West Suval and South Suval (2, 4, 5, 18).
Their later scenery jobs still own the passage obstacles, cave, trails and
settlement details. The standalone highland builder retains its original ground
through the same helper. There are no added terrain triangles or physics changes.

The helper exposes the exact Float32 triangles before initial-country foliage
construction; its cached heights and cell mask are then reused by the ground
job. This avoids an initial-region timing dependency. The renderer support API
composes this surface with existing ground support. It preserves the separately
reviewed Babon, Gala and Telemonia handling.

The four reviewed countries' existing scatter and West Suval's roadside olive
and hawthorn trees move only vertically, seating their complete rotated trunk
feet 3 cm into the visible surface. Their canopies move by the same offset.
Candidate filters, random draws, positions, scales, rotations, colours, species,
IDs and log types remain exact. Solis's four orange trees retain their original
bases. Tutorial reservations, city geometry, quests, physical terrain and
collider footprints are unchanged.

## Final regression evidence

`node --test --test-isolation=none tests/r11-woodland-grounding-review.test.js`
passes **5/5** on the frozen candidate. The 41.68 s run is diagnostic elapsed
time, not an isolated performance benchmark. It verifies:

- All 3,597 original typed identities; 217 instanced batches and 442 meshes retain
  their original geometry and non-Y transforms/colours.
- All 3,593 corrected country trees meet the drawn ground at approximately 3 cm
  embed. Across 72,036 trunk-foot vertices, the production support callback and
  independently read triangles differ by at most `3.6e-15` m.
- The four orange-court bases remain exactly 7.8/8.1 m.
- Fast Luscia receives all three existing fine meshes before readiness; later
  West Suval loading reuses those same objects, support heights and tree heights.
- Standing-tree hide/regrow retains corrected transforms and restores each
  tree's own blocker.

The original 285,202 fine-ground and skin triangles preserve the complete
position/colour/index hash:
`578128884d491f8b2ed7733a229c12f6ba72005ef8e5b6bdf26ab24994d94063`.
Tree identity hash:
`f317803c1968a59457075c46f6d7b6ed9549a2192966468fa91ee086c7626229`.
Non-Y scenery hash:
`6c67bd0032020dcc9575a96db6d516e4afc998200677056d0a48487c34538d94`.
Physical heights under every reviewed tree also retain their original hash.

The test is registered explicitly in `tests/test-manifest.json`. Detailed
before/after measurements are in this checkout's ignored
`tests/artifacts/r11-woodland-before-grounding.json` and
`tests/artifacts/r11-woodland-after-grounding.json`.

The existing standalone compatibility suite,
`node --test --test-isolation=none tests/suval-highlands.test.js`, also passes
**7/7** in 14.20 s. It exercises real switchback movement, cave and landing
clearance, cliff barriers, drawn trail footing, border continuity and flight
clearance through the helper's standalone fallback.

Source scope is `world-regions.js`, `west-suval-world.js`,
`suval-highlands-scenery.js`, the new ground helper, and narrow `world.js`
ground-job/callback wiring. No wildlife or regional terrain formula was changed.
The next acceptance step is native woodland and Luscia/Suval boundary views,
followed by the remaining R11 habitat and arrival coverage from the joint plan.

## Read-only habitat reconnaissance

Configured homes were compared with the current atlas and all neighbouring
`WEST_LIFE_ZONES`, the older road flocks, and authored discovery-bird habitats.
These are source counts before home relocation and collision filtering, not
assertions that every resident currently spawns or appears in a native view.

| Country | Existing distribution | Finding |
| --- | --- | --- |
| Drent | 84 deer/hare/boar residents across 42 cells, plus village ecology, attached squirrels and repeated woodland bird homes | Broad coverage already exists; do not add another density pass without a reproduced gap. |
| Luscia | Three bank birds and seven discovery birds across 23 cells; no dedicated countryside mammal bands | The western wooded interior is thin. At the forest centre `(-1000.002,375.410)`, the nearest Luscian home is 304.6 m away; the nearest configured animal home including neighbours is 159.9 m away. |
| Moros Plain | Eleven sheep and five crows/vultures, concentrated around a few places, across 31 cells | Preserve the open, treeless plain. The west-central cell at `(-1250.002,462.013)` is 382.2 m from its own country's nearest home and 250.2 m from any neighbouring home. Review that journey before choosing a modest open-country population. |
| West Suval | 46 countryside residents in the 23 cells outside Solis, plus 11 authored sheep/hare/gull/hawk residents | Broad coverage already exists, with the intentional Solis exclusion preserved. |

The configured audit is reproducible through
`tests/artifacts/r11-configured-habitat-audit.mjs`; its JSON output records the
coordinates, species and distances. The remaining questions are live habitat
admission, visibility and return behaviour, rather than a blanket count target.

Two separate older-system details need focused reproduction before edits:
Drent and West Suval animals still use analytic soil for their visual feet
because they are outside the reviewed `visualFootingRegions` allowlist; and
the old road flocks choose homes before deferred regional colliders finish.
Several road-flock numeric region labels are also historical (for example,
the Moros sheep still say region 2 although their atlas owner is region 3).
Those labels do not currently drive their distance culling, so they are not
evidence that the animals themselves appear in the wrong country.

Existing `drent-wildlife.test.js`, `regional-wildlife.test.js`,
`woodland-life.test.js` and the later cases of `road-life.test.js` build the full
world. They were inspected, not repeated during this read-only reconnaissance.
The efficient next check is to add actual wildlife bodies and return journeys
to the already bounded R11 fixture, then obtain an ordinary woodland/native
interior view before authoring additions.


## Bounded starting-country wildlife correction

The scoped wildlife baseline builds only Drent, Luscia, Moros Plain and West
Suval, then reads the actual animal instance origins against independently
raycast coarse/fine ground triangles. Of the established ground residents,
25 of 84 in Drent and 19 of 56 in West Suval differed by more than 2 cm. The
worst body origins were 1.433 m below the visible Drent ground and 0.986 m below
West Suval ground. This was a rendering mismatch, not a change to their logical
homes or movement height.

`west-regions-life.js` now extends its existing visual-footing allowlist to
these four countries. Floaters, sea animals and soaring birds retain their
original footing. Simulation, flee/return rules and existing zone definitions
are unchanged. The rendered origin check now measures at most 0.0000038 m
error across 150 ground bodies; both airborne residents are also checked.

`starting-country-wildlife.js` adds six small bands: two deer and two boar in
Luscia's western copses, two hares in its eastern grass, two pairs of hares on
the western/southwestern Moros plain, and one circling hawk. Every admitted
ground home is dry, in its declared country, at least 8 m from actual quest
sites and beyond each actual road half-width plus 3 m. The four woodland
animals are 2.97?9.76 m from actual retained trees. Moros homes remain in open,
treeless grass rather than introducing a woodland biome. No existing wildlife
home, tree, road, tutorial or regional-density rule is removed or moved.

At the selected western Luscia and west-central Moros cell centres, the nearest
own-country home falls from 304.6/382.2 m to 17.5 m. This is a bounded coverage
addition: other Luscian cells remain roughly 200 m from a configured home;
the report does not claim uniform coverage or completed native acceptance.

The representative member of each new ground band retreats 54.6?88.8 m through
the real collision/terrain world under a sustained approach, then returns to
within the controller's existing 6 m settling radius. Identities survive
retreat, return, pause and distance culling. New ranges remain inside the
130 m activation radius, and use the existing region-readiness gate and lazy
shared animal meshes.

`tests/r11-habitat-review.test.js` is registered in the explicit manifest.
The original 141 residents' IDs, species, logical positions, home coordinates
and scales are pinned by SHA-256
`55359edba93c8c17818e649d02c9b6c6b37394a1490916bfb2c087090d2cc49c`.
The first final check caught an unrelated new seam-compatibility callback
bypassing local village/pond/port ground layers during generic scatter
eligibility. Correcting that callback restored the original hash exactly; the
test's expected value was never changed. The final scoped command
`node --test --test-isolation=none tests/r11-habitat-review.test.js` passes
**5/5**, explicit exit 0, in 74.20 s. This is a correctness runtime rather than
an isolated benchmark. The five checks cover all 152 residents, all new ground
bands' actual dry retreat and return, pause/culling identity, and a complete
27-second hawk circle above its own country. The recorded home/body evidence
is in `tests/artifacts/r11-wildlife-before.json` and
`tests/artifacts/r11-wildlife-after.json`.

Native woodland/plain acceptance remains separate. Useful new home centres:
Luscia deer `(-1000.002,375.410)`, boar `(-950.002,288.808)`, eastern hares
`(-400.002,375.410)`; Moros hares `(-1250.002,462.013)` and
`(-1150.002,808.423)`. These are subject locations, not verified camera framing.
