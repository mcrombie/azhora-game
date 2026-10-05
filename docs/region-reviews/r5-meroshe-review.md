# R5: Meroshe tree identity and wildlife review

Review worktree `azhora-game-region-review`, base `13448f7`, 4 October 2026.
This bounded pass covers North, West, Central and South Meroshe Desert (runtime
IDs 43?46). Full regional acceptance and native journeys remain separate.

## Trees and harvest identity

The current production scatter has **63 North Meroshe thorn trees**, not the 71
in the historical job report. Their manual batch had no tree registry, harvest
handles, species or save identity, and used analytic center-ground placement.
The existing silhouettes, seeded positions, rotations, scales and colors remain.

`Meroshe hamada thorn trees` now uses the same six-sided leaning-root support and
stable `southwest-<x to 3 decimals>-<z to 3 decimals>` registry as R4. The trunk and
all three crown handles move vertically together; felling controls those exact
handles and the existing trunk collider.

The lore describes scrubby thorn trees without a botanical species. The new
`desert-thorn` / **Desert thorn** identity labels that existing builder style; it
does not claim an additional external lore species or replace it with acacia or
common hawthorn. Its own `desert-thorn-logs` use the established small-tree tier
(level 1, one log, 25-second regrowth). Inventory and firewood lists derive from
the shared catalog. No new plank recipe, tree population or climate is added.

## Existing wildlife and habitat

Seven ranges contain fourteen residents: five bone-birds in four airborne
ranges, three West Meroshe shore gulls, three North Meroshe thorn-ground hares,
and three South Meroshe fog-margin hares. Region range counts remain 2/2/1/2.
The Central sand sea's single high bone-bird is deliberate sparse coverage over
31 arid hexes; it is not evidence of a missing generic woodland population.

The retained scene confirms all three northern hare homes have an actual thorn
tree within 25 m, plus nearby low thorn. All three southern hare homes have fog
thorn and lichen within 10 m. The gull sites are 12.4?20.5 m inland from the
western shore. The focused fixture checks those associations against the actual
scene, dry ground/collisions, flight/return paths, and identity through culling.

A historical exclusion is stale: `southwest-wildlife.js` says a spine-lizard rig
and bask/dart gait are unavailable, but `west-regions-life.js` now implements
both. That technical excuse must not be reused. The fauna overview places the
largest forms in canyon country east of the interior; it does not by itself
require a new band in each of these four countries. No unverified reptile,
nocturnal sand-cat, livestock herd or settlement is added in this pass. Tortoises
already exist in the later Dinelv basin review area. Existing sand-cat/night
support and any additional species need a separate habitat-backed decision.

## Confirmed visible wildlife footing defect

The first production fixture found the second West Meroshe shore gull at
`(-3730, 2470)` **1.33944 m above the actual rendered terrain triangle**, despite
valid dry logical footing. The other two gull homes differed by 5.2 and 17.1 cm.
The wildlife renderer had an existing displayed-ground correction for newer
western regions, but its region allowlist omitted R4/R5.

The narrow correction adds those eight region names to that existing visual
callback. Position, movement, water checks, home/site IDs, population and timing
remain unchanged; floating, sea and permanently airborne animals still keep
their existing height rules. The final test reads the body-origin instance
matrices against independently sampled real triangles both at home and during
Meroshe flee/return, and checks visibility changes do not mutate simulation.

## Verification and seam interaction

The existing focused `tests/southwest-trees-review.test.js` now builds R4 and R5
through one production Fast fixture. It independently samples actual terrain
triangles across every reviewed root footprint and exercises saved harvest
state, exact mesh/collider removal, own-species logs and regrowth. The focused
file is already registered in the explicit manifest.

The pre-seam artifact `tests/artifacts/r4-southwest-post-rooting-reference.json.gz`
remains unchanged. All **141 southwest instance batches** retain this SHA-256
across names, counts, colors and every transform component except vertical
translation:
`5d5fe3c73728694bdb58ed6c34624c58637a36c883586dd4d802ea55add05b30`.
This pin includes all later R6/R7 scenery. The optional
`AZHORA_COMPARE_SOUTHWEST=1` review additionally compares changed Y values with
that frozen artifact, allowing the reviewed trees and the terrain worker's
bounded seam band only (up to 4 m for offsets from a bush's ground anchor).

Final command (PowerShell):

```powershell
$env:AZHORA_COMPARE_SOUTHWEST='1'
node --test --test-isolation=none tests/southwest-trees-review.test.js
```

**8/8 passed**, 47.11 seconds elapsed; this is not a performance benchmark.
All **233 roots** (170 R4 + 63 R5) meet actual triangles, with zero exposed or
over-buried footprints. Meroshe's measured range is -0.030036 to -0.029936 m.
The exact non-Y/color hash matches. The retained-scene comparison finds **536
reviewed tree Y changes**, **2,232 bounded seam Y changes**, **139,841 unchanged
instance heights**, and **zero unexpected changes**. All 170 prior R4 tree IDs,
coordinates, heights, species and log identities remain exact.

Actual posed body origins meet displayed terrain for **41 R4/R5 ground
residents**, with floating/soaring heights and all simulation state unchanged.
All fourteen Meroshe residents spawn at their authored sites. The north hares
flee 57.60 m and settle within 5.98 m of home; the south hares flee 57.52 m and
settle within 5.97 m; shore gulls fly 34.14 m and land back at home. Dry footing
and displayed height are checked throughout those journeys, then resident
identities survive culling/reappearance.

Pure catalog checks passed for species/kind/log agreement, one-log harvest,
saved felled state and inventory stacking. The focused fixture also validates
sale/firewood eligibility and regrowth. The pure inventory suite passed 11/11;
wildlife loading/visibility regressions passed 9/9.

## Remaining review

Native arrival/ordinary regional journeys, four-country route and coast review,
Full/Fast equivalence and checkpoint reload are not established by this scoped
pass. R6 Dinelv/Hama and R7 Marosh/Trogo manual tree identity are now documented
in their separate tree reviews; the later combined all-thirteen-country run
passes 14/14 and retains the same scenery layout/color hash.


## Native floating-stone correction

The later native dry-shore and fan photographs showed detached shadows beneath
hovering stones. Their shared batch builder positioned stone centres from
analytic ground before applying the authored rotation and flattening. The
visible coarse terrain can differ from that height, especially on the fan bank.

The correction is limited to `Meroshe fan cobbles` and `Meroshe shore shingle`.
It seats the transformed stone hull on the existing rendered ground, with a
small size-dependent embed, while retaining its horizontal position, scale,
rotation, colour and random-stream order. All other stone and surface-material
batches retain their prior placement. Physical ground and collision are unchanged.

The final combined Southwest fixture passes **15/15** in 46.08 s. Of the 1,770
fan cobbles and 203 shore stones, 146 and 46 respectively formerly floated more
than five centimetres above their support. Every corrected hull meets the actual
drawn triangles within 6 mm of its intended embed. The all-141-batch non-Y
transform/colour hash remains exact. The archived scene comparison records
1,973 reviewed stone-height changes, alongside the separately reviewed tree and
seam corrections, with zero unexpected changes; all R4?R7 tree, save and wildlife
checks remain green. The final native dry-shore and fan retakes confirm visible stone contact.

The old fan review view aimed beyond the land into open sea; its derived camera
was 25.9 m below the local hillside before camera pull-in. The proposed replacement
looks across the fan skirt from `(-3560,2430)` toward `(-3690,2390)`. The reg view
now has a proposed westward view across the actual stone floor from
`(-2715,2810)` toward `(-2910,2845)`, instead of aiming into the Trogo-side rise.
The root agent applied those review-camera updates and confirmed that the fan
and reg retakes now frame their intended surfaces. The separate Vaellir view
still needs a further framing adjustment.
