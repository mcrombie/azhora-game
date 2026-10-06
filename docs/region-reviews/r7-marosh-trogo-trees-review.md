# R7: Marosh and Trogo trees and visible wildlife

Review worktree `azhora-game-region-review`, base `13448f7`, 4 October 2026.
This bounded pass covers existing manual trees and wildlife display grounding
in Marosh 50 and Trogo 51. It is not full regional or native acceptance.

## Authored inventory and evidence

The retained production scene has **4,503 previously unregistered R7 trees**:
608 Marosh holm oaks; 2,240 Trogo canopy trees, 164 emergents, 1,222 fog-forest
trees and 193 mangroves; plus 76 existing gallery poplars/willows/tamarisks
(35 Marosh, 41 Trogo). Their original batches supplied collision but no stable
harvest/save identity.

A systematic sample of 59 retained trunk matrices outside the earlier R4 seam
bands found **43 exposed** root footprints and **9 buried** beyond 4 cm against
the exact production Float32 triangle reconstruction. Maximum sampled exposure
was 2.001 m in the fog forest, 1.376 m among emergents, 1.134 m in Marosh oak,
1.046 m in mangrove and 0.387 m in canopy. These are sampled baseline findings;
the final production fixture checks every loaded root on actual triangles.

## Specific identities without changing the layout

| Existing authored batch | Registered species |
| --- | --- |
| Marosh holm oak | Holm oak |
| Trogo canopy | Mahogany |
| Trogo emergents | Kapok |
| Trogo fog forest | Strangler fig |
| Trogo mangrove | Red mangrove |
| Gallery poplar / willow | White poplar / black willow |
| Tamarisk | French tamarisk |

Holm oak and the river types follow existing authored identities. Trogo's
specific tropical species are explicit builder assignments within its existing
layers and climate, not claims that the external lore names those taxa. The
lore describes emergents, canopy, upper canyon figs and mangrove ecology; it
does not give a botanical list. Existing catalog mahogany, kapok and strangler
fig fit those styles, while the new **red mangrove** identity keeps the coastal
mangroves distinct and yields its own `red-mangrove-logs` at the established
hardwood skill tier. No random species rolls or visual replacement are added.

Every trunk now has its coordinate ID, existing collider and three crown
handles. Root support uses the existing six-sided leaning-foot sampler against
shown ground. Only vertical placement changes; all seed draws, XZ, rotation,
scale, colors, counts, gallery extent, exclusions and undergrowth rules remain.
The scattered ground buttress/understory props remain part of their authored
landscape, separate from the existing manual trunk/crown tree handles.

## Visible wildlife

The same omitted display-footing correction affects both countries. At authored
sites, **18 of 34 ground residents** differ from shown terrain by over 5 cm;
examples include a Trogo estuary wader buried 0.499 m, a Trogoreth otter floating
0.370 m and a Marosh gull floating 0.304 m. The display allowlist now includes
Marosh and Trogo. It changes no species, home/site ID, population or movement
rule, and preserves the existing water/air exclusions.

## Verification and limits

The all-thirteen-country production fixture in
`tests/southwest-trees-review.test.js` has separate R7 tests for all 4,503 roots,
species-specific logs and saved partial stock, exact mesh/collider felling and
regrowth, and actual posed animal origins versus real terrain triangles. It
also reruns R4/R5 and R6 checks in the same constructed scene.

All 141 southwest batches retain their frozen non-Y/color hash:
`5d5fe3c73728694bdb58ed6c34624c58637a36c883586dd4d802ea55add05b30`.
The original ignored artifact is retained for the ordered Y comparison; allowed
changes are reviewed tree rooting and bounded R4/R6 seam adjustment only.

Final review command:

```powershell
$env:AZHORA_COMPARE_SOUTHWEST='1'
node --test --test-isolation=none tests/southwest-trees-review.test.js
```

**14/14 passed**, 44.35 seconds elapsed, on the frozen R6 seam/climbing source.
The ordinary manifest runs 13 self-contained tests; the fourteenth is the local
retained-artifact comparison. No performance benchmark is claimed.

All **4,503/4,503 R7 trunks** have unique coordinate IDs and their assigned species.
Every actual rendered root footprint lies **-0.030257 to -0.029733 m** below the
supporting surface, with zero exposed or over-buried roots. All eight R7 timber
identities retain their own logs through partial saves, felling, exact mesh/
collider removal and regrowth. All **40 existing R7 residents** remain, including
**34 ground animals** with correctly posed displayed origins and unchanged
physical homes, simulation identity and water/air rules.

The full non-Y/color hash is unchanged. The ordered retained-scene comparison
records **18,740 reviewed tree Y changes**, **3,064 bounded seam Y changes**,
**120,805 unchanged heights** and **zero unexpected changes** across all thirteen
countries. R4/R5 checks, all R6 cases and the original 170 saved identities pass
in the same scene.

Native arrival/ordinary journeys, Trogo path/undergrowth traversal, river/estuary
approaches, Full/Fast equivalence and checkpoint reload remain separate
acceptance work. This pass adds no settlement, civilian, port, logging activity,
recipe or story content.

## Native visual follow-up

The main Full-mode follow-up completed with exit 0 and no renderer errors (`tests/artifacts/r6-r8-main-native-views.log`). The Marosh gap, Trogo canopy, gully and estuary images were inspected. The canopy has a convincing dark interior and visible grounded buttress trees; the estuary reads as water beside a forest margin. The gully camera is occluded by foliage and needs recapture. Some low decorative clumps deserve a later contact check. This batch establishes visible scene evidence, not ordinary-input or persistence coverage.

## Ordinary route and wildlife review, 4 October 2026

A scoped real world for Marosh and Trogo now exercises ordinary novice movement,
body collision, undergrowth, stamina, swimming and the production terrain-fall
controller. The shared Celder controller follows the host update order; no
position nudges, collision exemptions, fall immunity, healing or recovery starts
are used. This is constructed-world evidence, not an Electron input journey.

The first full-way baseline (`r7-route-baseline.json` and `.log`, 51.97 seconds)
found three distinct conditions:

- The Marosh middle-combe centreline meets a visible original oak at
  `(-2644.921, 2309.512)`. A normal fixed sidestep preserves the tree. A later
  direct segment meets scrub at `(-2623.066, 2314.514)`; a wooded combe is not an
  authored cleared road. The caravan road through the Water Gap remains unbuilt.
- Trogo's south gully crosses an internal hex edge with a 1.087 m physical step.
  The 258.56 m return journey finished with full health but entered one fall and
  snapped up 1.141 m, so it failed supported-walk acceptance.
- Trogo's north link crosses a second internal edge with a 2.482 m step. Its
  403.21 m return journey entered nine falls, including a 2.467 m return drop,
  and snapped upward 2.488 m. No health was lost, but that is not safe continuous
  support. The first hare diagnostic also mistook its normal 0.3 m hopping lift
  for ground error; the check now reads `groundY` and leaves hopping intact.

Only the two reproduced internal Trogo atlas edges were added to the existing
physical Southwest seam correction: `(-24,137), edge 2` and `(-28,140), edge 1`.
The correction has a 6 m full core and fades to zero at 36 m. It changes neither
the atlas nor global terrain blending. Existing habitat/seed eligibility fields
retain their original blend, so no legacy callback or world dispatch change was
needed. Water, tree locations, species and props were not edited.

`tests/trogo-seams-review.test.js` passes 2/2. Along 101 points on each complete
edge, the greatest height differences across 2 mm are 0.000518 m and 0.000885 m.
All 687 frozen terrain probes outside the two bands are exact. The four Southwest
river profiles retain SHA-256
`0d5e9bfec4c70ea4131c65203b40543f301e1b1675ced8f0b053f0510df4e5d2`.
The pre-change terrain/profile artifact is `r7-before-terrain.json`.

The first constructed candidate (`r7-route-candidate.json` and `.log`, 48.15
seconds, 5/7) verifies the complete south gully out and back: **258.2 m, zero
falls, zero damage, zero swimming, greatest ordinary rise 0.109 m**. Every one of
141 Southwest batches retains the original non-Y/colour hash, and all 4,503 R7
saved coordinate identities remain. The 1,296 actual trunk footprints in both
changed areas plus their coarse-triangle apron are embedded from -0.030257 to
-0.029802 m below independently read Float32 terrain triangles.

The artificial north-link step and its fall cascade are gone. Its original
coastal endpoint remains a separate, continuous steep slope: the endpoint is
30.1 m inland with gradient 1.48, and the final return enters one fall near
`(-2300.86,2718.30)`. A complete ordinary descent to that endpoint is **not
accepted**. The bounded interior review instead enters from the middle-gully
junction, follows the actual north link through the canopy gap to the dry
overlook `(-2300,2723)`, and returns. The ordinary Marosh woodland walk uses the
upper middle combe and fixed oak sidestep, returning before the lower wooded
terrace. Neither bounded walk is presented as complete-country traversal.

Both existing representative animals now have real retreat/return evidence with
a stationary, clear-footed observer and unchanged simulation. The Marosh terrace
hare retreats 20.662 m and returns within 5.749 m of its original home; the Trogo
south-gully boar retreats 18.480 m and returns within 5.851 m. All simulated steps
stay dry, collision-clear and inside the original owned ranges. Ground support
is exact, identities persist, and returns are simulated while the groups remain
active rather than produced by distant settling.

The committed route suite is `tests/r7-routes-review.test.js`. Set
`AZHORA_R7_ROUTE_TRACE` to retain its structured evidence. Set
`AZHORA_R7_FULL_APPROACHES=1` to rerun the unresolved whole-combe and whole-north-
link reproductions with the same strict assertions; they remain explicitly
separate from the bounded walks. At this stage native ordinary-input, river/estuary approaches,
Fast/Full regional equivalence and checkpoint acceptance remained open. The later
representative ordinary-input result is recorded below; other gates remain open.


The final bounded fixture (`r7-route-final.json` and `.log`) passes **7/7**, explicit
exit 0, 42.80 seconds elapsed. The upper Marosh combe walk covers **121.2 m** out
and back, the complete Trogo south gully **258.2 m**, and the interior north link
**325.0 m**. Every journey returns to its original departure with zero falls,
zero damage and zero swimming. Maximum ordinary rises are 0.071, 0.109 and
0.048 m respectively, all below the existing step allowance. The unchanged
scenery hash, all 4,503 saved identities, all 1,296 reviewed root footprints and
both wildlife returns pass in that same fixture. This closes these representative
ordinary-route and wildlife gates; it does not accept the unresolved coastal
descent or all forest travel. No performance benchmark is inferred from elapsed
time. The final production change is limited to `src/content/regions/southwest/southwest-world.js`; no
shared world hook, scenery generator or wildlife source changed in this pass.


## Verified connection between the gullies

The authored Animal Paths description promises a connection between the north
and middle gullies, so merely ending at the overlook would leave that promise
unproven. A diagonal inner-bank approach already exists inside the original
open field: `(-2352,2706) -> (-2332,2714) -> (-2312,2718) -> (-2300,2723)`.
It is 54.94 m long, has maximum physical support slope 0.5672 and minimum
existing openness 0.5674 (the ordinary gate is 0.5). It needs no earthwork,
climbing exemption, forest clearing or moved tree.

The focused actual-controller check (`r7-bank-connection.json` and `.log`)
passes **1/1**, explicit exit 0, 39.59 seconds elapsed. It walks the **complete
recommended north-to-middle connection and returns: 434.6 m, zero falls,
zero damage, zero swimming, full health, maximum ordinary rise 0.0843 m**.
Every waypoint is reached continuously from the middle-gully departure.

Those exact verified points are now `TROGO_NORTH_LINK_WALK` and the north-link
row's `walkLine`. The Animal Paths guidance directs the traveler along the
upper inland bank before curving south, and identifies the direct coastal face
as steep. The original `line` remains unchanged as the undergrowth/scenery
footprint, preserving all existing seeded vegetation. Only guidance metadata
and prose changed after the successful physical fixture. The final pure suite
passes **3/3**, including exact verified waypoint data, continuous ordinary
support and existing openness along the whole recommendation.

The ordinary manifest now uses the full recommended gully-to-gully journey in
place of the earlier 325 m overlook-only walk. The original straight coastal
descent stays runnable under `AZHORA_R7_FULL_APPROACHES=1` as an explicit
hazardous diagnostic; it is no longer the recommended route. The preceding
7/7 constructed suite still supplies unchanged scene identities, roots,
Marosh/south-gully walking and wildlife evidence. No additional constructed
scene was needed merely to expose the already-tested points as guidance.


## Native recommended Trogo connection, 4 October 2026

MAIN Fast session **2863** completed the recommended route with real W input:
**217.5 m middle-to-north and 217.2 m north-to-middle**, continuously reaching
every waypoint with no falls, swimming or damage. The combined process later
failed the separate R4 ghubr shade check; that does not erase the completed
Trogo route traces. They are retained in
`tests/artifacts/r4-r7-first-native/r4-r7-journey-fast.json`, alongside both
gully captures and the original log. Subsequent R4-only retakes deliberately
omit this already verified route. This closes representative native traversal
of the recommended Trogo connection, not complete Marosh/Trogo visual, habitat,
Full/Fast equivalence or checkpoint acceptance.
