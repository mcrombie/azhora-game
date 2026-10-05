# R6: Cape Heth, Dinelv and Hama trees and visible wildlife

Review worktree `azhora-game-region-review`, base `13448f7`, 4 October 2026.
This pass covers tree identity/root support and wildlife display grounding.
Dinelv traversal, climbing and six neighbor seams are reviewed separately by the
terrain/controller worker. Runtime IDs are Cape Heth 47, Dinelv Highlands 48,
and Hama 49; historical job briefs use superseded IDs.

## Measured defects and bounded fixes

The retained production scenery contains **26 Dinelv basin thorn trees** and
**23 Hama wind trees**, all previously missing registry/save/species records.
Cape Heth has no authored tree batch; none is added.

Using the preserved actual trunk matrices and the exact production Float32
coarse-grid triangle reconstruction, all 49 roots outside the earlier R4 seam
bands were probed. **25 were exposed** beyond 2 cm and **16 buried** beyond 4 cm.
The largest exposed footprints were 4.352 m at Dinelv `(-3486.818, 1880.571)` and
0.725 m at Hama `(-3034.907, 3043.252)`. The final fixture independently checks
actual loaded mesh vertices rather than relying on that exploratory sampler.

Both batches now receive stable coordinate IDs, exact trunk/crown handles and
their existing colliders. The leaning six-sided root is embedded 3 cm into the
drawn ground; all three crowns share that vertical translation. Seeded draws,
XZ, rotation, scale, color, counts, exclusions and country ownership remain.

| Existing tree style | Specific timber identity | Basis |
| --- | --- | --- |
| Dinelv basin thorn | Desert thorn | Same authored dry-basin thorn type formalized in R5 |
| Hama wind-shaped evergreen | European olive | Builder assignment within the authored Mediterranean/wild-olive style; not an external lore assertion |

The Hama choice retains all 23 existing silhouettes. It adds no orchard, fruit,
field, resident or cultivation claim. Both species already have log/skill rules.

The wildlife display callback also omitted these three regions. An authored-site
probe found **16 of 27 ground animals** differed from displayed terrain by more
than 5 cm: one Hama gull was buried 0.885 m, a Hama hare floated 0.439 m, and a
Cape Heth gull floated 0.401 m. The existing displayed-footing allowlist now
includes the three regions. Logical positions, physical movement, population,
IDs and water/air height exceptions remain unchanged.

## Verification

The production `tests/southwest-trees-review.test.js` fixture covers all thirteen
southwest regions once, with separate R6 and R7 cases. R6 checks every root,
registered species and unique ID, partial/felled saves, own-species logs, exact
mesh/collider removal and regrowth. Wildlife checks actual body instance origins
against displayed triangles, initial physical habitat, paused observer identity,
active poses and culling, retaining floating/soaring heights.

The retained pre-seam artifact is unchanged. All 141 scenery batches continue to
be pinned by their names, counts, colors and every non-Y transform byte:
`5d5fe3c73728694bdb58ed6c34624c58637a36c883586dd4d802ea55add05b30`.
The optional artifact comparison admits only reviewed tree Y and the terrain
worker's bounded seam Y (with at most 4 m for bush offsets), while checking the
170 original R4 IDs/coordinates/species again.

Final review command:

```powershell
$env:AZHORA_COMPARE_SOUTHWEST='1'
node --test --test-isolation=none tests/southwest-trees-review.test.js
```

**14/14 passed**, 44.35 seconds elapsed, on the frozen R6 seam/climbing source.
The ordinary manifest runs 13 self-contained tests; the fourteenth is the local
retained-artifact comparison. No performance benchmark is claimed.

All **49/49 R6 trunks** have species and coordinate IDs, and every root footprint
meets actual displayed triangles: range **-0.030322 to -0.029742 m**, with zero
exposed or over-buried roots. Both species retain their own logs through partial
saves, felling, exact collider/mesh removal and regrowth. All **33 existing R6
residents** remain, including **27 ground animals** whose actual posed origins
meet the displayed terrain. Logical dry habitat and water/air rules pass.

Across all thirteen countries, **4,785 trees** and **102 ground residents** pass.
The full non-Y/color hash is unchanged. The ordered artifact comparison records
18,740 reviewed tree Y changes, 3,064 bounded seam Y changes, 120,805 unchanged
heights and **zero unexpected changes**; all 170 prior R4 identities remain exact.

No R6 native arrival, ordinary journey or checkpoint reload is claimed by this
tree/display pass. Dynamic animal routes beyond the checked poses remain outside
this bounded correction; the controller worker owns Dinelv route acceptance.
