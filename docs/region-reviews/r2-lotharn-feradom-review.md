# R2: West Lotharn Mountains and Feradom

Review worktree: `azhora-game-region-review`, corrections from `13448f7`, 4 October 2026.
This is a bounded correction and regression record, not full R2 acceptance. Main,
Claude's frozen Celder delivery `136b582`, and the East Izol build remain separate.

## Confirmed defects and corrections

- **Feradom floating tree roots:** reproduced against the actual indexed triangles
  of `Feradom barrier hills ground`, independently of the placement callback.
  Of 3,729 trunks wholly over the fine mesh, 2,259 had an exposed bottom vertex
  above the 2 cm tolerance; 919 were buried beyond 4 cm. The largest visible gap
  was 5.899 m at approximately `(-894.487, -1092.141)`. The analytic hill height
  does not equal the 3 m triangle surface on sharp shoulders.
- The scenery now interpolates the same cached float32 vertices and triangle
  split it draws. It seats the complete six-sided trunk footprint 3 cm into
  that surface and translates the crown by the same amount. Outside drawn fine
  cells it uses the production rendered-ground callback supplied by `world.js`.
  Candidate selection, seeded random draws, species, height, horizontal position,
  tree IDs, and hill terrain are unchanged.
- **West Lotharn interior wildlife:** the nine original zones deliberately left
  forest interiors empty. Four appended woodland bands add five boar and five
  red deer on sheltered shelves and shoulders: southern spur, middle long valley,
  cold-head shoulder, and eastern foot. Existing rigs and resident path-memory
  behavior are used. Each range enforces region ownership and a 0.6 maximum
  slope; existing 24 animals retain their zone order and authored sites.

## Evidence

- `tests/feradom-scenery-review.test.js`: **2/2 pass**. The independent actual-mesh
  probe now finds **zero floating and zero buried roots** across all 3,729 trunks
  wholly on detailed ground. Highest root gap is approximately -0.02981 m.
  One edge trunk crosses outside the detailed mesh and is excluded from this
  fine-mesh-only measurement; the production callback supplies its coarse ground.
- All **3,730** Feradom tree identities are unchanged. SHA-256 of ordered
  `[id,x,z,height,species]` records before and after correction:
  `03cbb57000457a36be3a7f368e262bd4996a2a3f4d24150bcbf6a4a5e19b552e`.
  The standalone check also verifies both timber species, harvest collider
  removal/restoration, and existing farmland vegetation clearances.
- `tests/regional-farming.test.js`: **4/4 pass**. Existing Feradom beds retain
  seed, tending, save/load, and once-only harvest behavior; legacy common beds
  still load alongside the regional fields. No new farms were added.
- `tests/feradom-wildlife.test.js`: **4/4 pass**, using production scoped region
  21. The hill-tree identity hash also matches in the real world (separate farm
  orchard trees retain their own named IDs). A felled silver fir and partly cut
  white oak restore the same saved stock; the restored fir removes its collider.
  All seven farms have usable beds, authored approaches, seed benches and tool
  shelters. Existing plain/hill coverage, dry placement, crop exclusions, flight
  response, rendering and stable residents through culling all pass.
- `tests/west-lotharn-woodland-review.test.js`: **3/3 pass**, using production
  scoped region 27. All ten authored homes are clear without relocation, dry,
  outside balds/ramps/water margins and within 28 m of at least four actual trees.
  All four bands visibly flee and return through real scenery with checked
  collision and slope footing, then retain resident identities through culling.
  The old 24 site records are unchanged; total West Lotharn population is 34.
  The cold-head pair uses the broad wooded shoulder near `(-2300,-510)`, about
  237 m high; an initially tested low pocket proved too confined for retreat.

All four files were run separately with `node --test --test-isolation=none`:
**13 tests pass**. Both new test files are registered in `tests/test-manifest.json`.

Separately, the route agent's updated production-scoped
`tests/west-lotharn-traversal.test.js` passes **2/2**. The crest ascent reaches
544.6 m after 969 m on foot, with minimum stamina 63.6 and zero damage. The return
reaches the valley at 84.7 m after 899 m walking and six successful normal
Space/grab plus S/downward climbing transitions, in 4.1 simulated minutes.
Minimum stamina is 45.2, with 74.1 spent and recovered, zero damage and no
exhaustion. A W-only attempt took 25 fall damage at climb-required sections;
the proved route is a controlled descent using existing climbing, not a claim
that every steep section can be walked downhill. No production geometry or
movement controls were changed for this route check.

## Scope preserved and remaining review

- Feradom already has seven spread-out farm clusters and countryside wildlife.
  The historical empty-plain report is not a new implementation assignment.
  Existing regional farming files, field IDs, wildlife zones and population are
  retained. The existing Feradom wildlife test now constructs only production
  region 21 with `scopedWorld`, including actual shared jobs and colliders.
- West Lotharn continuous summits, corrected tree grounding, the crest ascent,
  cave system, terrain heights and shared relief functions are unchanged here.
  The updated crest ascent and controlled return pass as recorded above.
  Other ordinary descents, cave-mouth journeys, arrival/skyline/habitat visual
  judgment, and native Full/Fast departure/reload evidence remain required for
  complete R2 acceptance.
- Celder remains intake-only. Its future integration must retain the West
  Lotharn edge behavior identified in `celder-intake-review.md`: admitting Celder
  names into a previously excluded land-owner branch can change existing relief
  outside the delivered files. Recheck the shared edge on the combined revision;
  do not rebaseline an unintended height change as expected behavior.
- Tests ran sequentially in the coordinated Node fixture slot. A separate R1
  native journey may run concurrently, so durations are not performance claims.


## West Lotharn beck visibility correction

The native `west-lotharn-valley` view exposed grass separating a continuous
water ribbon into blue strips. The old 7.1 m ground triangles bridged the narrow
beck: at `(-1786.606,-667.709)` they stood 0.270 m above the water, although the
physical bed was 0.30 m below it. The 3 m mountain layer could cover it too.

`west-lotharn-river-ground.js` replaces only nearby indexed ground faces with
locally sampled triangles, preserving the old planes along the outside edges.
It retains the separate buried global and mountain layers and samples their
actual visible Float32 triangles for tree footing. The original candidate slope
filter is retained so tree identities and the seeded scenery stream do not
change. Water profiles, physical terrain, collisions and routes are untouched.
The production kit receives only the additional `terrainRoot` argument.

The new registered `tests/west-lotharn-river-ground.test.js` passes **5/5** in
14.88 s with a scoped production scenery fixture. It checks 2,335 physically wet
water samples across all four becks: none are hidden, no water/ground surfaces
are missing, and the root sampler agrees with independent raycasts. At 1,333
outer-edge probes the largest join difference is 0.000001958 m. All 66 nearby
trees, checked at 1,320 actual root vertices, meet the drawn surface. This also
corrects three existing buried trees beside Kemrath where retained terrain
layers overlap. Fast mode's regional tile apron covers every refined corridor.

All 3,178 tree ID/species/position/height records retain SHA256
`6f75d6f6c4def7f2953820fd74070ac475691f775ada480e187b9c2b879e57ce`.
All 236 instanced batches (14,180 transforms) retain their rotations, scales,
horizontal positions and colours, with SHA256
`186d6f0a6e35581a8e41f54c9a92f31935338f286c1f41543ae8ebb5fa96c685`.
The final 1.5 m spacing passes the same coverage as the initial 0.75 m mesh,
using 32,657 vertices and 61,550 triangles across 13 local ground patches: 75%
fewer triangles. The refinement itself takes 1.332 s in this scoped build.
The final native valley retake confirms continuous visible water through the
former grass-covered gaps. No fort flood is required for a correction that
leaves physical ground unchanged. Broader R2 visual and journey review remains
separate from this bounded repair.
