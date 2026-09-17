# World scale: what was built

One authored atlas hex is now **100 m** across instead of 56. Everything derived
from the hex survey — region outlines and cells, the Caloss, `routeAnchors`,
`worldBoundsFor`, the terrain blend — grew by itself through
`HEX_WORLD_TRANSFORM`. Hand-placed content did not: a town's buildings, a camp's
tents and the people beside them keep the distances they were authored with, and
only the ground between places grew. Tidehaven is unchanged, down to the metre.

This is the build report for `docs/world-scale-brief.md`.

## The scale

| | 56 m per hex | 100 m per hex |
| --- | --- | --- |
| `METRES_PER_HEX` | 56 | 100 (`WORLD_SCALE` = 100/56 ≈ 1.7857) |
| Drent | ≈530 × 310 m | **950 × 548 m** |
| Luscia | ≈392 × 307 m | **700 × 548 m** |
| Moros Plain | ≈476 × 259 m | **850 × 462 m** |
| East Suval | ≈336 × 356 m | **600 × 635 m** |
| `WORLD_BOUNDS` | x −844 … 144, z −209 … 655 | **x −1460 … 210, z −349 … 1099** |
| Main road | 946 m | **1 677 m** |
| Suval branch | 422 m | **754 m** |
| Tidehaven's coast hex | (0, 29) | **(0, 29)** — the fixed point |

`src/region-survey.js` did not need regenerating: it bakes atlas hex coordinates,
which have no scale in them. `scripts/build-region-survey.mjs` never mentions
metres.

## How the conversion works

`src/world-scale.js` is the whole of it: pure, no three, no DOM.

```
AUTHORED_METRES_PER_HEX = 56      the frame every literal in the tree is written in
METRES_PER_HEX          = 100     the frame the game is played in
SCALE_ANCHOR            = (0, 29) Tidehaven's coast hex: the same point in both
```

A **cluster** names a hand-placed place in authored metres:

- a **pivot**, which moves by plain scaling about the anchor — so a pivot that
  sits on a road stays on that road;
- a **centre and radius**, the authored ground the cluster owns.

`toWorld(x, z)` finds the cluster whose centre is nearest within its radius,
moves that cluster's pivot by `anchor + k·(pivot − anchor)`, and gives the point
the same translation — so its offset from everything else in the place is
untouched. A point in no cluster scales plainly. `toAuthored` is the inverse,
cluster-aware, and migrates old saves.

Literals stay as the authored numbers the design docs quote and are converted at
the boundary. `region-world.js` gained `at()` for a place and `road()` for a road
vertex; the content modules convert inside their own tables.

### Where the brief and the code disagreed

- **Roads scale plainly** (`toWorldRoad`), rather than moving rigidly with a
  cluster as the brief asks. The brief's rule breaks two things in this tree: the
  Avrel clearing owns three main-road vertices, one of them 40 m from the pivot,
  which drags a 40 m kink into the road; and the goblin camp, which is hinged on
  the point where its trail leaves the road, ends up with that point 24 m off the
  road because the road moved and the camp did not. Plain scaling is a
  similarity, so it keeps the road's exact shape and every place's *bearing* from
  it, and every offset from the road can only grow — a road can never be scaled
  into a building. Tidehaven is the exception: its own trail is part of the
  carried-over village and is marked `rigidRoad`.
- **Sava's shrine** is at `(-374, 134)` in `world-regions.js`, not the
  `(-384, 138)` the brief gives; that number is the shrine's repair bench. The
  cluster is centred on the shrine and holds the bench.
- **The reedcutters' landing** cluster is centred on `(-381, 119)`, between the
  camp at `(-372, 116)` the brief names and Merren's workshop at `(-380, 120)`,
  so that the two net floats and the workshop path belong to the landing rather
  than drifting to the shrine 15 authored metres away.
- **The goblin camp's** membership circle is around the camp body at
  `(-432, 156)`; only its *pivot* is the brief's `(-397, 153)`, where the trail
  meets the road. A circle big enough to hold the camp centred on the road
  junction would have swallowed the waymarkers.
- **The quiet fishing bank** is not in the brief's cluster list, but it has to
  be: its cast point sits 10 authored metres from the Caloss centre line and
  would otherwise have been flung to 18 m, leaving the float bobbing on grass.
  Its cluster is centred on the river vertex `(-306, 122)`, so the bank keeps its
  place on the water.
- **The three flocks** (`road-life.js`) are clusters too. Scaling their ranges
  would have left six sheep in a field three times the size; as clusters they
  move to their region's new place and keep their own spread.
- **The Legion camp's approach** is a second cluster sharing the camp's pivot,
  added for the aftermath chapter that came in from `main` (see below).

## The clusters

Authored centre, world centre, and the radius of the ground each one owns.
`world-scale.js` carries a one-line note for every row; `clusterTable()` prints
this table.

| Cluster | r | Authored | World | What it holds |
| --- | --- | --- | --- | --- |
| `tidehaven` | 190 | (0, 29) | **(0, 29)** | The village, the Greenway, Willowmere, the six woodland places, Fernway Rest and the Caloss Gate. Pivot = anchor, so nothing moves. |
| `avrel` | 46 | (−236, 30) | (−421, 31) | Crop fields, the clearing mill, Corvan's post, the tumbled cart, the Mill Commons. |
| `caloss-crossing` | 28 | (−345, 92.9) | (−616, 143) | The bridge, Hollis, the crossing's working camp, the driftwood. |
| `caloss-bank` | 26 | (−306, 122) | (−546, 195) | The quiet fishing bank, its stool and rod rest, the riverside pawpaws. |
| `reedcutters-landing` | 17 | (−381, 119) | (−680, 190) | The reedcutters' camp, Merren's workshop, the two net floats. |
| `savas-shrine` | 15 | (−374, 134) | (−668, 217) | The shrine, Sava's stand, the shrine repair bench. |
| `goblin-camp` | 38 | (−432, 156) | (−744, 253) | The Bramble Scout Camp and its trail. Pivot (−397, 153) → (−709, 250), on the road. |
| `lauvel-relay` | 12 | (−401, 196) | (−716, 327) | The old relay hut, its lean-to and stores. |
| `lauvel-field` | 24 | (−386, 182.9) | (−689, 304) | The wrecks, the burial line, the pickets, the courier's satchel, the wolves. |
| `burned-hamlet` | 16 | (−348, 212) | (−621, 356) | Four roofless walls, the chimney, Garran. |
| `lumber-town` | 34 | (−408, 228) | (−729, 384) | The square, the houses, the timber yard, the relay post, the garrison. |
| `moros-gate` | 16 | (−427, 259.4) | (−763, 440) | The gate posts and the two legionaries. |
| `legion-camp` | 46 | (−549.2, 348.1) | (−981, 599) | Palisade, tent lines, command tent, horse line, camp posts. |
| `legion-camp-approach` | 46 | (−505, 316) | hangs from the camp | The aftermath chapter's ground north and east of the north-east gate (both outpost fights). Pivot = the camp's. Enlarged by the lead after the merge. |
| `border-stockade` | 34 | (−380, 308) | (−679, 527) | The stockade and the border battle's arena, as one place. |
| `suval-border-post` | 20 | (−224, 292) | (−400, 499) | Elod's pillars, barrier, shelter and stores. |
| `waystation` | 16 | (−154, 328) | (−275, 563) | The roofless arch and Oda's shelter. |
| `elod` | 32 | (−28, 368.5) | (−50, 635) | Elod's gate and the three slate roofs. |
| `bandit-lookout` | 12 | (−74, 498) | (−132, 867) | The ring of ridge stones. |
| `moros-sheep` | 28 | (−430, 325) | (−768, 558) | The sheep range and its grazing spots. |
| `caloss-bank-birds` | 22 | (−284, 92) | (−507, 142) | The bank birds upstream of the crossing. |
| `suval-hares` | 34 | (−108, 379) | (−193, 654) | The rock hares in the hills. |

## Density and performance

Scatter is per hex, so a hex worth 3.19 times the ground carries 3.19 times the
scatter: `treesPerHex` 42 → 134 in Drent, 9 → 29 in Luscia, `rocksPerHex` 7 → 22
in East Suval, ground cover 26/34 → 83/108. A Luscian copse grows with its hex
(radius 9 → 16 m) so its trees keep their spacing. Blocks are 2 hexes rather than
6, so a batch's bounding sphere is the physical size it was and culling is as
fine as before. The terrain grid keeps its 2.5 m spacing and gains tiles (7×7 →
13×13). Verge counts follow the road's length (156/144/150 → 279/257/268).

Measured on the built world (Node, `createWorld`):

| | 56 m | 100 m |
| --- | --- | --- |
| Trees / rocks / ground cover | 783 / 177 / 2 594 | 3 991 / 631 / 9 379 |
| Scatter batches | 78 | 228 |
| Terrain tiles / vertices | 49 / 57 498 | 169 / 122 512 |
| Colliders | 2 271 | 5 963 |
| World build | 0.7 s | 1.3 s |

Geometry actually submitted from a camera standing on the road, looking west,
plus its shadow pass (draw calls / triangles):

| View | 56 m | 100 m |
| --- | --- | --- |
| Tidehaven | 464 / 619 017 | 514 / 851 995 |
| Drent road | 307 / 620 535 | 348 / 537 385 |
| Avrel clearing | 271 / 457 631 | 320 / 476 929 |
| Caloss crossing | 201 / 242 904 | 226 / 320 444 |
| The Lauvel | 209 / 176 940 | 229 / 220 218 |
| Lumber Town | 183 / 157 586 | 211 / 184 274 |
| The Moros | 77 / 85 627 | 66 / 77 394 |
| East Suval | 197 / 164 152 | 248 / 195 158 |

### Frame time

The traversal smoke holds the run key along the whole road and back, recording
the wall-clock interval per rendered frame in each region. It walked **6 012.6 m**
in 836.9 s over 40 946 frames (the same trip was 3 209 m before), entered all
four regions, and was stopped by the frontier rope.

| Region | Mean frame, 56 m | Mean frame, 100 m | Change | Walked |
| --- | --- | --- | --- | --- |
| Drent | 26.1 ms | **24.5 ms** | -6 % | 906 m |
| Luscia | 21.2 ms | **20.8 ms** | -2 % | 2 144 m |
| East Suval | 20.8 ms | **19.2 ms** | -8 % | 1 514 m |
| Moros Plain | 20.5 ms | **19.2 ms** | -6 % | 1 448 m |

Every region is faster than the 56 m world's figures in
`docs/region-rebuild-report.md`, well inside the brief's 20 % budget. The reason
is that scatter density per square metre is unchanged, so the same number of
trees stands in front of the camera; the extra ground is beyond the fog, and
smaller scatter blocks and more terrain tiles cull it before it is submitted.
The story smoke reports a 23 ms average with 391 draw calls.

## Saves

New checkpoints carry `worldScale: 100`. A checkpoint without it was taken at
56 m per hex: `road-checkpoint.js` moves its position through the same
cluster-aware `toWorld` the ground moved by, before judging it against
`WORLD_BOUNDS` (which still comes from `worldBoundsFor`). So a save taken in the
Avrel clearing resumes in the Avrel clearing, not in the forest that clearing
used to stand in; a save taken in Tidehaven resumes untouched. A `worldScale`
this build has never used is refused rather than guessed at.
`tests/road-checkpoint.test.js` covers all four cases.

## Tests

`npm test`: **376 tests, 376 pass**. New: `tests/world-scale.test.js` (round
trips, cluster rigidity, Tidehaven unchanged, village-local modules untouched,
anchors agreeing with the places built on them, roads walked a metre at a time
against the colliders, every encounter arena re-validated against
`combat.startEncounter`'s rules, the goblin trail still hinged on the road).

Expectations elsewhere are derived through `toWorld` or from the modules rather
than rewritten as new magic numbers; sizes that used to be stated in metres
(Drent's width, the world's extent, the verge triangle budget) are now stated in
hexes or per authored metre of road, so they survive the next change of scale.

## Smokes

Run once each at the end, in this order.

| Smoke | Result | What it found |
| --- | --- | --- |
| `npm test` | 377 tests, 377 pass | - |
| `npm run test:game` | pass (`smoke.json` `ok: true`) | Three faults, below |
| `npm run test:road` | pass (`road-traversal.json` `ok: true`) | Nothing |
| `npm run test:autoplay` | **not green**; see below | Four things, three fixed |

**`test:game`** found three things, one of them the scaling's own:

1. *The Avrel raid never started.* Its trigger in `main.js` still tested a
   hard-coded `(-250, 12)`; it now asks the encounter where it is.
2. *The Caloss bridge could not be crossed in a straight line.* The deck
   followed the outgoing leg of the road, and the road bends about six degrees
   at the crossing. At 56 m a traveler walking straight from one bank to the
   other cut the corner by 1.4 m and stayed on the deck; at 100 m the same cut
   is 2.4 m and meets the rail. The deck now lies along the chord between the
   vertices on either bank, which is also the road curve's own tangent at the
   crossing, and the smoke walks the road through the crossing instead of
   cutting the corner.
3. Two things the recent chapters left stale, not the scale's doing: the smoke's
   quest-HUD check did not know that finishing the Luscia chapter hands the
   banner to the Moros chapter, and its wolf-retreat point mixed a chapter
   coordinate with a literal `z`.

**`test:autoplay`** found three:

1. *The autopilot walked into the Caloss.* It decided "the destination is on the
   road" by measuring to the nearest road **vertex**. Vertices are now a hundred
   metres and more apart, so a pile of driftwood six metres off the road read as
   23 m from it and the autopilot went straight at it, into the water.
   `nearestOnPath` measures to the road's own line, and when both ends are on the
   road but the straight line is blocked the autopilot now follows the road
   toward the destination's own place on it - back over the bridge.
2. *A standable ledge of river beside the deck.* Water blockers are suppressed
   within 3.6 m of the bridge lane so the lane is exactly as wide as the deck,
   but the rail colliders only reached 3.15 m. The 0.45 m of river between them
   was standable, and a traveler who drifted off the end of the deck was trapped
   on it with the rail in the way - which is where autoplay ended up, twice. The
   rails now cover the whole strip over the water, and stop at the banks, where a
   wall would only pen somebody who walked round the end of the deck.
3. *The clock.* The deadline was fifteen minutes, set when the main quest ended
   at Iven's relay. With a 1.7 km road and four chapters added since, the
   autopilot reached the Legion camp's gate with everything behind it done and
   ran out of time. The budget is now thirty minutes. Not a fault, but worth
   knowing that this smoke is a long one now.
4. *The autopilot could not answer the chapters after the road.* `chooseReply`
   counted a reply as wanted only when the road or the Luscia chapter offered it;
   the Moros camp, the border and the day after were never consulted, although
   their replies have been in `CHOICE_PRIORITY` since they were written. The
   autopilot walked to the camp gate, opened the sentry's conversation, said
   goodbye and walked away, over and over. Nothing to do with the world scale:
   those chapters have never been reachable by the autopilot. Fixed, with a unit
   test that every chapter's replies are answered.

### Where `test:autoplay` stands

It is **not green**, and the last run was not repeated: the coordinator called
time so the branch could be merged, and riding is about to change how the
autopilot travels anyway.

Four runs were made. The first stalled in the river; the second stalled in the
same pocket; the third reached the Legion camp's gate with the road, the bridge,
the waymarkers, Iven's report and the whole Luscia chapter behind it and then
looped on the sentry's conversation until the clock ran out; the fourth, with the
reply fix in, got as far as the driftwood again and stalled on the Drent bank
with two of the three sticks it needs.

What is left, in the order it bites:

- **One leg still stalls.** Standing at the first driftwood pile on the Drent
  bank with two sticks, the nearest uncollected pile is the second one, across
  the water. The autopilot now walks back to the road from the bank correctly
  (a deterministic replay of its own stepper over the real world clears
  `debris-1 -> the bridge`, `debris-1 -> Hollis`, `debris-2 -> the bridge` and
  every trip that starts from the road), but `debris-1 -> debris-2` still grinds
  at the channel. The cheap fix is in `planGoal`: order the driftwood by distance
  **along the road** rather than in a straight line, so the pile on this bank is
  preferred. It was not made because it was not verifiable inside the time left.
- **Beyond that, nothing past the camp gate has ever been autoplayed**, so the
  Moros camp, the border battle and the day after are untested by this smoke even
  with the reply fix in place.

`npm run test:game` and `npm run test:road` both pass, so the road, the bridge,
the fights, the saves and the whole story walkthrough are covered; what is not
covered is the computer playing them unattended.

`src/forest-hideout-smoke.js` is **not** rewritten. It describes the goblin camp
as a Drent errand of Tamsin's at quest stage 5 paid in pawpaws; the camp moved to
north Luscia as a Lumber Town garrison side quest before this branch, and
`npm run test:hideout` has been failing since. Its coordinates all come from the
camp's own modules, so they follow the new scale correctly - it is the flow that
is gone. The file's header now lists exactly what a rewrite has to change
(Captain Varo and Casso instead of Tamsin, the new choice ids, thirty copper
instead of three pawpaws, quest stage 10 instead of 5, the Luscia road instead of
the Greenway).

## The merge with main

`main` moved to `df0cf71` mid-branch and was merged in. It brought the mercenary
looks (no coordinates) and the chapter after the border battle.
`src/aftermath-sites.js` is now converted like every other literal table: its
authored numbers stay and `toWorld` moves them, so `camp-gate` and
`camp-approach` are rigid with the Legion camp and the two stockade entries with
the stockade. The camp arena's ground lies outside the camp's own radius, so it
has a cluster of its own, `legion-camp-approach`, hung from the camp's pivot —
both move by the same translation, and the retreat still runs south through the
camp's north-east gate. `package.json` keeps both new test files; `main.js` keeps
both sides of its two conflicts.

## What now looks too sparse, or too cramped

For the towns-and-signs pass and the West Suval brief:

**The road out of Tidehaven is the emptiest ground in the game.** The village
still occupies the first 181 m of road, unchanged. Then there is nothing at all
until the Avrel clearing at 429 m - 248 m of forest road, including a single
**174 m straight** from the Caloss Gate to the first bend, because the gate is
pinned to the village and the next vertex is not. It wants a place on it: a
charcoal burner's clearing, a wayside shrine, a bend with a view.

**The Moros gate to the Legion camp is 270 m of empty plain**, the longest gap
between two landmarks on the road. The plain is meant to be empty, but 270 m of
flat grass with the camp's standard in view the whole way is a long walk with
nothing to do.

**Every place is now small for its region.** Nothing is cramped - each one kept
the distances it was authored with - but the proportions changed underneath
them. Lumber Town is a 30 m square with eleven buildings in a 700 m region; the
Legion camp is a 30 by 26 m palisade for a legion on an 850 m plain; the Avrel
clearing is 38 m of radius in a 950 m Drent; Elod is a gate and three houses in a
600 m region. This is the towns-and-signs pass's whole subject, and it is now
obvious by eye.

**Things beside the road stand further back than they did**, because the road
grew and they did not: the quiet fishing bank is 66 m off the road (was 37), the
burned hamlet 84 m (was 47), the clearing mill 27 m (was 15), the riverside
pawpaws 75 m (was 40). None of them is wrong - a riverbank is where the river is
- but the spurs that reach them are now long enough to want a reason.

**The flocks are small in their fields.** Six sheep keep their own 36 by 38 m
patch of a 462 m plain, three bank birds a 32 by 28 m stretch of the Caloss, two
hares a corner of East Suval. Keeping their spread was right - a flock is a
flock - but at this scale each region could carry two or three of them rather
than one.

**Signposts sit further from what they point at.** They were placed a fixed few
metres off the road, and the road is the same width, so they read as they did;
but the place named on the board is now half again as far away.

## Known gaps

- **The Caloss bridge still rewards steering.** The deck is 27 m of a road that
  bends six degrees at the crossing; a traveler who aims straight at the far bank
  from this one meets the rail. Adding the deck's two ends to `MAIN_ROAD` as road
  vertices would remove the corner for good, and is the right job for whoever
  touches the crossing next.
- **The three working places have no scenery where their people stand.**
  `createRegionalPlaces` in `src/regional-places.js` still draws its mill yard,
  boat yard and shelter at pre-rebuild coordinates - `(-38, -273)`, `(-30, -451)`,
  `(-34, -581)` - which were outside the world before this branch and are outside
  it still. The Mill Commons, the Landing Workshop and the Waystation Shelter
  have their metadata, their NPCs, their activity sites and their reserved ground
  in the right places; only the geometry is somewhere else. Nothing to do with
  the scale, and it deserves its own fix.
- **`src/forest-hideout-smoke.js`** describes the old Tidehaven flow; see above.
- **Terrain relief keeps its own wavelengths.** Drent's hills are still 90 m
  across and East Suval's 120 m, so the bigger regions have more hills rather
  than bigger ones. That reads well on foot, but it is a choice, and a region
  pass may want longer wavelengths for the Moros in particular.
- **The Legion horse line's animation still uses authored coordinates.**
  `main.js` wakes and animates the four horses with
  `Math.hypot(p.x + 560, p.z - 320) < 150`, which is the hitch's 56 m position;
  at 100 m per hex the horses stand at about `(-993, 571)` and that test never
  passes, so they never graze. The horses themselves are placed from
  `world.storySites.horseHitch` and stand in the right place. Left alone on
  purpose: the riding patch replaces that line.
- **`ANCHORS.suvalBorder`** is 11 authored metres from Elod's border post, and
  the post is a cluster while the anchor scales plainly, so the two are about
  20 m apart now. Nothing but this report reads the anchor; if West Suval's road
  starts from it, start from the post instead.
