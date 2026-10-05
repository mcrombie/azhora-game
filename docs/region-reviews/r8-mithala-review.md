# R8: the four Mithala regions

4 October 2026, review worktree after `13448f7`. The contact corrections and
shared-ground integration below are verified. The latest scoped blade seating
also has native visual approval; broader region/route acceptance is not inferred
from that correction. The authored river system, prairie, backswamps and northern
forest margin are retained.

## Reproduced tree and animal defects

The production scoped four-region scene contained267 visible trunks and no
registered tree records. Against the actual loaded Float32 terrain triangles,
207 trunks had exposed foot vertices and33 were excessively buried; the worst
exposed root stood2.44m above the visible ground. This is a rendering/interaction
defect, not a reason to move the gallery or alter its ecology.

Each existing tree now registers its original trunk, three crown slots and
collider. The authored gallery keeps black poplar, black willow and black alder;
previously unspecified broadleaf margin saplings use existing white oak as a
documented builder assignment. Black poplar gains its own logs at the existing
poplar harvesting tier. Tree IDs derive from the unchanged authored coordinates.

The full leaning trunk footprint is seated on drawn terrain and all crown parts
receive the same vertical offset. Random draws, horizontal placements, scale,
lean and colors are unchanged. The all-instance non-Y/color baseline remains:
`9ef91a92c30d560aa85c4fc0429cb54043afc6ea27629198af21f3e5a14c3652`.

The wildlife fixture then reproduced24 displayed body-origin errors among48
residents, worst1.026m at a northern goose. The shared visual-footing allowlist
now includes the four Mithala regions. It changes drawn origin only; simulation,
saved identity, flight and floating-water heights remain unchanged.

## Verification

`tests/mithala-scenery-review.test.js` passes3/3 in19.92s:

- All267 trunks retain their original scene layout and meet visible triangles,
  with zero exposed or overburied footprints (about3cm embedded).
- All48 animal poses meet their expected drawn ground/water/air height, without
  changing saved simulation state.
- All four species identify their own wood, and felling/regrowth hides/restores
  every matching trunk/crown slot and the original collider.

Logs in `tests/artifacts/`: `r8-mithala-baseline.log` (reproduced tree failure),
`r8-mithala-corrected.log` (tree repair passing and separate animal error), and
`r8-mithala-final.log` (all three pass). Timing is a fixture observation under
concurrent work, not a startup benchmark.

The existing regional suite is scoped to the four countries plus both Lotharn
neighbors through the production loader, retaining actual terrain/colliders and
all existing assertions. It passes14/14 in113.50s, including all116 authored
hexes, channel gradients, ford/plain traversal, both Lotharn interfaces and
wildlife distributions (`r8-mithala-world-review.log`). Native assessment remains
separate. No water, physical relief, river crossing or principal
route has been changed by these corrections.

## Native visual follow-up

Five main Full-mode views were inspected: `mithala-main-channel`, `mithala-gallery`, `mithala-horizon`, `mithala-fen` and `mithala-braid`. The batch ended with explicit exit 0 and no renderer errors (`tests/artifacts/r6-r8-main-native-views.log`). Channels are continuous, galleries follow their banks, and the broad open plain remains appropriate to the region. The main-channel foreground trunk partly occludes that view; low decorative clumps and a nearby stone need a bounded contact check. The fen is currently less distinct than the gallery or braid. These are visual findings rather than claims of additional movement or save coverage.

### Decorative contact and shared mountain support

The follow-up now seats all **3,187 three-lobe prairie forb clumps and 43 solid apron stones** against independently sampled visible Float32 triangles. One shared vertical offset keeps each clump's three parts together; lower-face seating retains the original horizontal placement, shape and colors. The final scoped fixture passes **4/4**, with all 267 tree identities and the original full non-Y/color scene hash intact. Log: `tests/artifacts/r8-prop-contact-final.log`.

The larger coarse-only gap at the West Lotharn edge was missing shared fine ground during Fast loading, not evidence that the fully loaded scene had floating plants by that amount. The [West Lotharn ground extraction](r10-western-seams-review.md) now makes those exact retained mountain triangles available to Mithala first, reusing them when the neighbor's detailed scenery loads. The Mithala contact changes and dependency are mirrored into the main desktop checkout. At this stage native recapture and Full/Fast journey verification were pending; later evidence and its scope are recorded below.


## Existing wet-margin blades: contact census

The corrected ready-region views from MAIN session 97739 target actual North
Mithala, not the formerly incorrect off-country view. Root and habitat reviewer
both inspected `mithala-fen.png` and `mithala-wet-tip.png`: sparse grass and low
plain relief are visible, but the wet margin is not yet distinctive. The named
Fen Margin target (-1850,-1990) has wetness 0.242 and backswamp 0.190; the owned
northeastern tip (-1522,-2070) has wetness 0.904. Both are dry in the summer
water contract. Neither view justifies adding a pond or building North Acor.

A scoped actual-scene census (82868; 4 existing tests pass, new contact test
fails as intended; 54.13 s under concurrent work) found the remaining blade
builder still used analytic centre height, unlike the already repaired trees
and low solid plants. All counts below are retained authored instances:

| Batch | Total tufts | Root footprint above soil by >3 cm | Entire tuft buried |
| --- | ---: | ---: | ---: |
| Prairie grass | 26,231 | 7,580 | 14 |
| Sedge and rush | 1,244 | 374 | 26 |
| River reed | 3,532 | 1,186 | 0 |

Within owned North Mithala where wetness >0.05 there are 178 sedge tufts;
101 have raised roots and 20 are entirely buried. Within 25 m of the named
fen target, 4 of 11 sedges are buried and 5 float; around the wet tip, 6 of 25
are buried and 17 float. No reeds occur in either target neighborhood, which
matches the source's dry fen-margin / permanent river-bank distinction.
Logs and exact category ranges are in `r8-blade-contact-baseline.log/.json`.

The bounded candidate changes only Y for those existing blade batches. It
samples every blade-base vertex against the retained Float32 surface and seats
the highest root gap 1.5 cm into that surface. It consumes no new random draws
and preserves all instance counts, horizontal placement, rotation, scale,
colours, tree IDs, residents, physics and water. No density addition is proposed
before the corrected native view is seen. The original all-batch non-Y/colour
hash remains the acceptance baseline. Final scene and native recapture results are recorded below.


Final scoped check 21733 passes **5/5**, explicit exit 0, in 63.24 s under
concurrent work. All 31,007 retained tufts now have zero floating root
footprints, zero wholly buried tufts and a visible tip more than 10 cm above
soil. The 178 wet-margin sedges and both native-view neighborhoods retain
exactly their original counts. Maximum base gaps are approximately -1.5 cm
(Float32 tolerance); within the owned wet margin, the deepest individual
base vertex is -0.351 m for grass and -0.227 m for sedge where a horizontal
clump spans a slope. Across all four regions one steep grass footprint reaches
-5.969 m at an individual vertex. This Y-only fix seats each entire footprint
without floating and keeps at least one blade visible; it does not pretend a
single horizontal instance can place every root at identical soil depth.

The original all-batch non-Y/colour SHA remains
`9ef91a92c30d560aa85c4fc0429cb54043afc6ea27629198af21f3e5a14c3652`.
All 267 tree identities/harvest operations, 48 animal poses, previously repaired
forbs and stones pass their existing checks. No density, shape, colour, water,
collision or physical terrain changed. Final log/census:
`r8-blade-contact-final.log/.json`. The two corrected native views are assessed
below; a distinctive wetland appearance is not inferred from contact tests.


The coordinator mirrored the final three-file blade-seating packet into MAIN
after the frozen Alezhor Full run. Its source, scoped test and report match the
review candidate. The coordinator inspected `r1-fast-mithala-fen.jpg` and
`r1-fast-mithala-wet-tip.jpg` from combined native session 6254. Both show ready
regions, the correct dry summer terrain, and visible seated blade clusters.
The scoped Y-contact correction is visually accepted; this adds no claim of
new water or increased plant density. Session 6254 completed with explicit
exit 0 and no renderer errors (R1 runtime checks 40 plus 9 Continue).
