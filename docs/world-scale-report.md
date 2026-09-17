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
| Main road | 939 m | **1 677 m** |
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
| `legion-camp-approach` | 24 | (−521.9, 310.15) | (−953, 561) | The aftermath chapter's ground outside the north-east gate. Pivot = the camp's. |
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

FRAME_TIME_PLACEHOLDER

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

SMOKE_PLACEHOLDER

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

SPARSE_PLACEHOLDER

## Known gaps

GAPS_PLACEHOLDER
