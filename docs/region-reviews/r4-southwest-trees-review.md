# R4: southwest tree identity and rendered grounding

Review worktree `azhora-game-region-review`, base `13448f7`, 4 October 2026.
This correction covers trees owned by Navarth, West Pyros, Ganesh Desert and
Ganesh Plain (runtime IDs 39–42). It is not full R4 terrain/wildlife acceptance.

## Reproduction

The production scoped fixture found **170 drawn R4 trunks and zero registry
records** in the existing southwest tree batches. The manual builder supplied
colliders but no stable tree ID, species, harvest handles or save identity.

An independent probe of the actual streamed terrain triangles found **110
exposed root footprints**, **39 buried beyond 4 cm**, and a maximum exposed gap
of **2.302 m** at approximately `(-3253.313, 865.477)` in Navarth's north wood.
The old placement used the analytic center height despite random trunk lean and
a six-sided root footprint.

## Bounded correction

`src/content/regions/southwest/southwest-scenery.js` now accepts a species selector in its tree helper.
The R4 pass enables it for existing northern-country instances (the later
Meroshe extension is recorded in the R5 report):

| Existing authored style | Registered species |
| --- | --- |
| Gallery poplar | White poplar |
| Gallery willow | Black willow |
| Tamarisk | French tamarisk |
| Navarth generic pine/oak | Existing `forestTimber` loblolly-pine/white-oak mapping |

The river mapping follows the existing Oves tree builder. Navarth reuses the
game's established generic pine/oak identities; this does not reroll or replace
the authored silhouettes, density, climate or forest extent.

Trees receive coordinate IDs `southwest-<x to 3 decimals>-<z to 3 decimals>`, their
existing trunk collider, and handles for the trunk and all three crown instances.
The six-sided leaning root footprint is seated 3 cm into production rendered
ground; each crown translates by the same amount. Root supplied the rendered
terrain callback in the shared `world.js` kit. No terrain or seam code changed.

## Validation

`tests/southwest-trees-review.test.js` builds the real four-region Fast fixture,
including the shared southwest scenery job. It reads terrain mesh vertices and
triangle indices independently of the placement callback. It checks registration,
species, saved felled/partial harvest state, and removal/restoration of the exact
trunk, crown and collider handles.

Before editing, the complete southwest instanced scenery produced this SHA-256
over every transform and color, masking only the intended R4 trunk/crown Y values:
`b93fa5b3a3629855824312b14603c1e9fb2b91097cb5f8389b711094dd658bda`.
The initial regression pinned that hash, including every later-region prop and
tree. The later combined R4/R5 fixture permits the explicitly reviewed seam/root
Y changes while pinning all other transform bytes and every color; see the
R5 Meroshe report for the retained pre-seam comparison and its new hash.

Post-correction `node --test --test-isolation=none tests/southwest-trees-review.test.js`
passes **3/3**. All **170/170** existing trunks have registered species and stable
IDs. There are **zero exposed and zero over-buried root footprints**; the highest
measured root gap is -0.02993 m. The complete transform/color hash is unchanged.
Saved felled and partial trees retain their stock; felling hides the exact trunk
and all three crown handles, removes its collider, and restoration reinstates
the original grounded matrix. The file is registered in the explicit manifest.

The optional `AZHORA_CAPTURE_SOUTHWEST=1` run also retained
`tests/artifacts/r4-southwest-post-rooting-reference.json.gz` for the next terrain
seam worker. This ignored artifact contains every southwest instance matrix and
color plus the 170 tree records, **after this rooting correction and before the
seam changes**. A later intentional terrain-height change requires new grounding
checks and an explicit comparison preserving horizontal placement, rotation,
scale, color and seeded order; do not silently rebaseline this record.

## Explicit R5–R7 follow-ups

The module serves all 13 southwest countries and its gallery batches include
later rivers. Those instances retain their existing transforms and are outside
this R4 registration/grounding correction. Their missing manual tree records
must be addressed in the corresponding review:

- **R5:** North Meroshe's `Meroshe hamada thorn trees`, now addressed in
  [the R5 review](r5-meroshe-review.md); final combined verification passes 8/8.
- **R6:** `Dinelv basin thorn` and `Hama wind trees`, now verified in
  [the R6 tree review](r6-southwest-trees-review.md).
- **R7:** `Marosh holm oak`; `Trogo canopy`, `Trogo emergents`, `Trogo fog forest`
  and `Trogo mangrove`; later-country gallery/tamarisk instances, now verified in
  [the R7 tree review](r7-marosh-trogo-trees-review.md).

Those follow-up reports document specific builder species assignments for the
previously generic styles. The later all-thirteen-country run passes 14/14,
including the retained-artifact comparison, without changing the layout hash. R4 native arrival, ordinary journeys,
river approaches, animal habitat/behavior and neighbor seam acceptance remain
separate work. No native process was launched for this correction.

## R4 visible wildlife footing follow-up

The combined R4/R5 review identified the same analytic/displayed-ground mismatch
in animals. A lightweight reconstruction of the exact production Float32 coarse
triangles reproduces the measured Meroshe gull result and shows northern sites
with material offsets: Navarth deer `(-3303, 893)` is 0.642 m below the triangle;
West Pyros heron `(-2915, 1130)` is 0.637 m below; stilt `(-2617, 1538)` is
0.480 m above. These are display offsets, separate from valid logical footing.

The existing wildlife visual-footing callback now also covers Navarth, West
Pyros, Ganesh Desert and Ganesh Plain. Only the region allowlist changes; it
preserves simulation positions/IDs and the air/sea/floating height exemptions.
The final combined fixture passes 8/8 and checks actual posed body-origin
matrices for 41 ground residents across all R4/R5 zones, plus unchanged floating
and soaring heights. At their resolved production homes the worst northern
offsets were 0.642 m below for the Navarth deer, 0.539 m below for a Vaellir
heron, and 0.480 m above for a stilt; all are corrected. No R4 wildlife population
or species is changed in this fix.

The ordered retained-scene comparison also passes: 536 reviewed tree Y changes,
2,232 bounded seam Y changes, 139,841 unchanged instance heights, and zero
unexpected changes. All 170 previous tree IDs, coordinates, heights, species
and log identities match exactly. The all-141-batch non-Y/color hash remains
`5d5fe3c73728694bdb58ed6c34624c58637a36c883586dd4d802ea55add05b30`.
See the R5 report for the final command and the scoped pass's remaining limits.
