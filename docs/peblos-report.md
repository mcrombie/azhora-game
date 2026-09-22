# Peblos: what was built

The build report for `docs/peblos-brief.md`, on branch `peblos`. Peblos is the
seventh playable region: six islands in the Stills south-east of Drent, open from
the first hour of the game. A traveler who has just stepped off the boat at
Tidehaven's pier can turn round, pay the man who rowed them in three copper, and
be set down on the quay at Cobble.

## What the atlas gave

`assets/azhora-dev-regions.json` already carried Peblos. Adding `'Peblos'` to
`PLAYABLE_REGIONS` (`src/region-layout.js`) and to `PLAYABLE` in
`scripts/build-region-survey.mjs`, then regenerating `src/region-survey.js`, gave
the game **nine hexes: five hills and four plains**, in axial q 11–17, r 107–111.
The survey window already reached far enough east, so `LAND_HEXES` did not
change — the islands were already land in the world, as unclaimed outland
ground, before this branch made them a region.

Nine hexes, and only two of them touch: the map's own answer is **six islands**.
`PEBLOS_ISLANDS` in `src/peblos-world.js` is derived from the survey at load
time by flooding hex adjacency, so their number, their sizes and their spread are
the map's and not this file's; `ISLAND_NAMES` only hangs a name and a landmark on
the island whose anchor hex it recognises, and the test says so.

| Island | Hexes | Terrain | Centre (world m) | What is on it |
| --- | --- | --- | --- | --- |
| **Cobble Island** | 3 | hills | (400, 433) | Cobble, its quay, the headland light, the seal cove, the drowned field |
| Longstone | 2 | hills | (375, 159) | The Longstone Beacon |
| Gull Scarp | 1 | plains | (250, 289) | Gull Scarp: white rock and a thousand gulls |
| The Pilot's Stone | 1 | plains | (50, 289) | The Pilot's Stone, the nearest Pebble to Drent |
| Wrack Island | 1 | plains | (150, 462) | The wreck of the *Sea-Mare* |
| The Saltings | 1 | plains | (−100, 375) | Salt pans and one standing stone |

**`WORLD_BOUNDS` grew east only**: `maxX` **210 → 560** (209.998 → 559.998), an
extra 350 m. `minX`, `minZ` and `maxZ` are untouched. Nothing else in the
registry moved: ids, outlines, the minimap, the trail charts, the region card and
the autosave on entering a region all follow `PLAYABLE_REGIONS`, and Peblos took
**region id 7**.

The islands' terrain is authored as its own profile in `REGION_TERRAIN` and
refined by each hex's atlas terrain (`byTerrain`, as Pueth does): hills stand at
10.5 m with 4.6 m of relief on an 85 m wave, plains at 3.4 m with 1.2 m — low,
rocky, wind-cut, and never more than about 15 m above the water. The biome
(`salt-islands`) carries almost no trees and four times Drent's rock, and builds
its own scatter (`ownScatter`).

## The crossing

**Jess** (`src/ferry.js`) is the man who rowed the traveler ashore in the
opening; he is still at the landing, on the pier deck beside his boat. He takes
**three copper** to Cobble and three copper back.

Three, because the traveler lands with `STARTING_PURSE` = 24: the islands are
open in the first minute of play without saving for them, four return trips still
leave something over for Wendel, and three copper is what a rye loaf costs on his
stall — which is about what an hour of somebody else's rowing is worth on this
coast. It is a fee, not a toll: he asks the same in both directions and never
more.

- **The scene** is 3.9 seconds and is not a sailing sim. The traveler steps into
  the boat (0.0–0.8 s), it pulls away from the quay at 3.2 m/s while the view
  fades (0.8–1.9 s), the screen holds black under the caption (1.9–2.9 s), and it
  clears on the far quay (2.9–3.9 s). Control is the traveler's before and after;
  `mode` is `ferry` in between, which no menu, no autosave and no input opens.
- **Safe to save.** The traveler is set ashore at the exact frame the veil reads
  1 — that is, while the screen is fully black — and the road is saved there, so
  nothing that reads a position after that point can read a position on the
  water, and the last save on either side of the crossing is a save on a quay. A
  checkpoint taken on Cobble's quay restores there: the quay deck is standable
  ground outside any authored hex outline, so `continueRoad` now accepts a saved
  position on a built deck as well as one inside a region.
- **Developer override.** While testing is enabled the fare is zero and the
  choice says so ("Take me out to Peblos. (testing · no fare)"). It is never free
  otherwise: the free hook is `testingEnabled` and nothing else. The testing
  panel has **Cross to Peblos · the islands** (`#test-peblos`), which skips the
  tutorial as the other travel buttons do, puts the traveler on Cobble's quay at
  once and leaves Jess at the quay head to bring them back — it does **not**
  advance any road errand, because Peblos is meant to be reachable before any of
  them.
- **The horse cannot come.** A mounted traveler is refused, and the refusal is
  spoken, not just greyed out: *"Not with the horse. He will not stand in a boat
  this size. Leave him ashore and I will take you."*
- **He waits on the shore the traveler is on.** Each frame the ferry settles:
  whichever side of the water the traveler stands on, that is where Jess and
  his boat are. It costs nothing when nothing has changed.

`FERRY_VERSION` 1 is saved with the road (`ferry: { crossings, met }`), validated
in `road-checkpoint.js` like every other section, and a save from before the boat
existed still loads.

## Cobble

The village stands on a shelf of made ground above a west-facing bay on the main
island's inner shore, sheltered from the north by the island's own headland and
looking back at Drent. Its ground is a terrain pad (`COBBLE_TERRACE` in
`region-world.js`), 22 × 26 m, level 3.0 m at the centre and rising one in ten
inland, feathered 24 m into the rock behind.

| | |
| --- | --- |
| Village centre | (334, 428) |
| Quay | root (323.5, 428) to head (299, 428), 6 m wide, deck at 2.1 m |
| Mooring | (300.5, 422.5), on the quay's north face where the bay is deep |
| Sea shrine | (324, 445) |
| Slip | (322, 437) |
| Landing (set ashore) | (315.5, 428) · boatman's stand (311, 430.2) |
| Region spawn | (316, 428), on the quay deck |

Buildings, world metres: net loft (330.5, 420.5), fish cellar (341, 417), salt
house (341.5, 430), tally house (327, 434.5), boat shed (330, 440), and five
houses at (345, 423), (346, 435), (343, 411), (348.5, 417) and (342.5, 441.5).
Stands: Bregga (330, 426), Hallin (324.5, 438.5), Maun (321.5, 432), Wyn
(337.5, 433.2), Pell (332, 415), Sela (326.5, 446.5), Dunnock (335, 423.5),
Bassus (330.5, 434.5), Ferro (321, 426.5), Nabo (339, 438), Crix (337, 444).

On the Drent side: Jess stands at (27, 30.6) at the seaward end of Tidehaven's
pier, his boat lies at (25, 24.8) on the pier's north side, and a traveler coming
home is set down at (14, 29) halfway along the boards, facing the village.

**The quay** is dressed stone laid out into the bay: a kerb of set stones down
both sides, six bollards, a capstan at the head against the north kerb so the
deck walks clear, a ladder down the seaward face and two mooring lines into the
water. Its deck is standable ground (`quayHeight`, checked in `world.js`'s
`heightAt` exactly as Tidehaven's pier is), and it ends where it ends: a traveler
who walks west off the head is stopped by the water, because the sea floor there
is two metres down.

**Ten buildings** (`COBBLE_BUILDINGS`), all of them plain — `cottage()` gained a
`plain` option that leaves off the window flower boxes, since nothing is grown on
a window ledge in the Pebbles. Along the quay: the net loft with the year's nets
hanging out of its upper floor, the fish cellar dug back into the rock, the salt
house, the boat shed over the slip, and the Empire's tally house. Five houses
climb the slope behind them.

**The working ground says what Cobble does before anyone speaks**: three drying
racks hung with split fish, three heaps of lobster pots, three upturned hulls on
the shingle by the slip with a pitch pot and a caulking bench, five barrels (the
Empire's mark burned into the fifth), a gutting table with a crate beside it, the
timber slip itself, and three gull rocks breaking the surface off the quay's
north side with the gulls sitting on them.

**The sea shrine** is a niche cut in the rock above the quay with a whale's rib
set over it and, inside, whatever the sea gave back this year. Nobody names a
god; they only say the sea is owed.

**The Empire's tally** is a table under a canvas awning outside the shed, an open
ledger, a standard on a pole, a spear rack and the marked barrels. That is the
whole of the Empire's presence in the province.

## The people

Eleven (`src/peblos-people.js`), each with two or three lines and no quest in any
of them.

- **Bregga Sell**, net-mistress, who keeps the nets and the tally and says the
  Empire's share to the decurion once a season.
- **Hallin Orme**, boatwright, at the slip: pitch, oakum and a dry week.
- **Maun**, lobsterman, on the quay by his pots: there is no fifth barrel in a
  lobster, so a lobster is his.
- **Wyn Tarrow**, salter, at the racks: the salt comes out from Tidehaven by the
  barrel and goes back inside the fish.
- **Old Pell**, a retired pilot on the turf above the bay: there is no chart of
  the Pebbles worth the vellum, keep the Pilot's Stone on your left hand.
- **Sela Vane**, keeper of the shrine, who lights the headland when a boat is
  out and has never seen the Empire pay for the wood.
- **Dunnock**, the quay runner, paid in fish for three jobs, and Jess's
  cousin — which is how the traveler learns that everybody on the quay is
  somebody's cousin.
- **Decurion Aulus Bassus** and legionaries **Ferro**, **Nabo** and **Crix**:
  four men, no wall, no garrison, counting barrels and bored out of their minds.
  The decurion writes down what Sell tells him and sends it to Ambron, and Ambron
  has had a war on its hands for a year.

The seam the brief asked for is the Empire's share and it is written from both
sides: one barrel in five, set when there were twice as many people to catch it,
and nobody has come out to set it again. The islanders are sour about the tally
and not about the men; Legionary Nabo says plainly that they are not rebels, they
are people who wish the number were six instead of five, "and that is not the
same thing, whatever the reports say." There is no quest on it yet.

Only the four Legion people wear Legion armour, and all four are men.

## The places

Four on the main island besides the village and the quay, one on each outer
island, all with discovery text.

| Place | Where | |
| --- | --- | --- |
| The Headland Light | (402, 371) | An iron basket on a stump of dry-stone tower on the island's highest rock. Cobble lights it; the Empire has never paid for the wood. |
| The Seal Cove | (402, 488) | Seals hauled out on the shingle of the southern neck, placed on the tideline itself, and they do not trouble to move. |
| The Drowned Field | (357, 402) | Three dry-stone walls running down the slope and on under the water, straight as they were laid. |
| The Sea Shrine | (324, 445) | Above the quay. |
| The Longstone Beacon | (375, 141) | A stone beacon the Empire built and stopped paying anyone to light. |
| Gull Scarp | (250, 289) | White rock, and the noise of it carries a mile downwind. |
| The Pilot's Stone | (50, 289) | The channel mark out of Tidehaven, with a cut on its seaward end. |
| The Wreck of the Sea-Mare | (150, 462) | Half a hull's ribs out of the shingle. She was carrying Ambroni grain, and Cobble has been careful ever since about what it says it found. |
| The Saltings | (−100, 375) | Salt pans scratched in the turf and one standing stone that was here first. |

## The islands' own scatter

`src/peblos-scenery.js` batches per island — one to three hexes each, so a camera
at Cobble submits nothing of the Saltings. Salt grass and thrift cushions in
pink and grey-green, gorse in flower, grey rock gathering at the waterline and
thinning inland, and sixteen wind-bent pines on the high rock of the two hills
islands, every one of them leaning the same way. Nothing else grows above a man.
Nothing stands inside the village, on the quay, or below the tideline.

## Two things the eye found in ground that was already there

Neither is Peblos's doing; both only became visible once there was a reason to
stand east of Tidehaven and look at the water.

- **Tidehaven's height field ran east for ever.** `villageWeight` faded the
  carried-over village ground sideways and inland but not *seaward*, so inside a
  248 m band of latitude the village's field applied at full strength out to any
  distance — and its `outer` term raised sandbanks out of the Stills a hundred
  metres offshore and over the northern half of Longstone, 252 m from Drent. The
  weight now fades seaward as well, from local z 56 to 96 (world x 36 to 76),
  which is past the end of the pier and the place where the village's own field
  and the ordinary sea floor already agree to within a tenth of a metre.
  Tidehaven, its bay, its beach and its pier are untouched, and so is the
  sideways reach the Pueth work pinned its river's mouth against.
- **A terrain pad could reclaim the sea.** Cobble's terrace, feathered 24 m,
  first pushed the waterline ten metres out and left the quay standing on sand.
  A pad may now be marked `shore`, and a `shore` pad lets go where the natural
  ground is already below the tideline, so it levels the rock it stands on and
  never lifts the sea floor into new land. Solis's pad is unmarked and behaves
  exactly as before.

Two smaller ones: the coast foam line and the chart's `coast-water` polygon
traced the *first* land they met scanning west from x = 428, which since the
scale change has been an island and not the mainland; they now skip the Pebbles.
And the Stills now reach 450 m past the world bounds on every side, with one
vertex per 32 m as before, because from Peblos the traveler looks east at nothing
else and could see the corner of the plane.

## Fitting it to what already exists

- **The chart** (`src/map-fog.js`) gains eight named areas: Cobble, the Cobble
  Headland, the Southern Shore, and one for each outer island. None overlaps any
  other area in the world (`tests/map-fog.test.js` and the new test both check).
- **Islands are land inside the chart's water.** The trail chart and the minimap
  paint `mapWaters` over the land, which would have drawn the whole of Peblos as
  more of the Stills. `world.mapLands` carries each island's softened outline,
  `local-map-data.js` passes them through as `lands`, and both charts paint them
  back over the water in the district's own parchment.
- `BUILD_STATUS.Peblos` is **early**, and honest about the outer islands.
- The developer atlas gains a Peblos stop on its authored hex (16,110), and
  `developer-mode.js` a ghost-travel point at the village.
- `campaign-world.js` and `campaign.js` already described Peblos: level 1,
  contested, pirates, an Ambroni naval station, a rebel ship in a sea cave. None
  of that is built; nothing was changed there.

## Files

New: `src/peblos-world.js`, `src/peblos-scenery.js`, `src/peblos-people.js`,
`src/ferry.js`, `tests/peblos-world.test.js`, `tests/ferry.test.js`, this report.

Changed: `scripts/build-region-survey.mjs`, `src/region-survey.js` (regenerated),
`src/region-layout.js`, `src/region-world.js`, `src/world-terrain.js`,
`src/world-regions.js`, `src/world.js`, `src/road-checkpoint.js`,
`src/local-map-data.js`, `src/trail-map.js`, `src/trail-map.css`,
`src/minimap.js`, `src/map-fog.js`, `src/build-status.js`,
`src/developer-atlas.js`, `src/developer-mode.js`, `src/adventure.css`,
`index.html`, `package.json`, `src/main.js`.

`src/world.js` (CRLF, patched by exact anchors): two imports, the quay deck in
`heightAt`, the shore trace skipping the islands, one call to
`createPeblosScenery`, the bigger sea, `mapLands`, four entries in the returned
object, the people, the places, `'Cobble'` on the road-sign atlas, and
`cottage()`'s `plain` option.

`src/main.js` (CRLF, patched by exact anchors): two imports, Cobble's people and
the boatman pushed onto `npcData`, `createFerry` with its hooks, `ferryAct`, the
conversation hook, one line in the frame loop, the ferry in `saveRoad` and
`continueRoad`, the quay clause in `onPlayableGround`, and the testing button.

`index.html`: the crossing's veil (`#crossing`) and the testing button.

## Coordinates

Peblos is authored **directly in world metres** (100 m per hex), like Pueth and
for the same reason: it never existed in the 56 m frame, and its ground is
measured from the waterline, which no cluster in `world-scale.js` describes. If
the world scale changes again, Peblos's places need clusters of their own in the
new frame. No cluster was added, and nothing in `world-scale.js` changed.

## Tests

`npm test`: **458 tests, 458 pass** — 187 s on an idle machine, 315 s with the
Electron smokes running beside it. Two new files, both in `package.json`'s list.

`tests/peblos-world.test.js` (8): the region against the atlas, nine hexes in six
islands with the main one named and every outer one carrying its landmark; every
island ringed by open sea, with the boat's own straight line shown to clip Gull
Scarp and nothing else; Cobble's ten buildings clear of each other and above the
tide, the terrace levelling rock rather than reclaiming the bay, and every stand
standable, four metres from every other person and reachable from the landing by
a flood fill; the quay walked end to end and the water beside and past it; every
place on its own island and charted, with the chart's land polygons and a local
chart model; the scatter island-bound and batched; level one — eleven people, no
armed stand, no enemy, and the Empire's share said from both sides; and the
region card, the build status and the spawn.

`tests/ferry.test.js` (8): the fare and the purse it comes out of; the fare taken
once and a refusal costing nothing; the developer override free and an ordinary
traveler never; the horse refused; the whole scene driven frame by frame, with
the traveler set ashore at the frame the veil reads 1 and the road saved there;
both directions and the boatman following the traveler's shore; the conversation
enabled, greyed with its reason, and free while testing; and the snapshot,
its validation, a real checkpoint written and read back on both quays, and a
corrupt one refused.

## Smokes

| Smoke | Result | What it found |
| --- | --- | --- |
| `npm run test:game` | **pass** (`smoke.json` `ok: true`) | Nothing. 1 721 frames, 476 draw calls, 864 k triangles, no errors, the whole story walkthrough from the landing to the road out of Drent. The 72 ms it reports as an average frame was measured while headless Chrome was rendering review shots on the same machine, and is not a comparison with anything. |
| `npm run test:road` | **pass** (`road-traversal.json` `ok: true`) | Nothing. 9 190 m walked out and back over 1 400 s and 38 061 frames, every region entered on foot, the road north into Pueth walked as a branch, the frontier rope holding, the return to Drent made, no errors. |

`npm run test:autoplay` was not run, as instructed. Nothing in Peblos is on
`paths[0]`, the autopilot never boards a boat, and its unit tests are untouched.

**On the traversal's frame times.** The smoke reports a mean wall-clock frame per
region, and the Pueth report used those figures as its performance measure. They
are not usable that way on this machine today. The traversal was run twice, the
first time with Node test suites running beside it and the second on an idle
machine, and the idle run was the *slower* of the two:

| Region | First run (machine busy) | Second run (machine idle) | `docs/pueth-report.md`, on an older day |
| --- | --- | --- | --- |
| Drent | 50.1 ms | 47.6 ms | 29.2 ms |
| Pueth | 37.6 ms | 40.5 ms | 25.0 ms |
| Luscia | 32.0 ms | 53.0 ms | 26.7 ms |
| East Suval | 31.6 ms | 55.3 ms | 23.9 ms |
| Moros Plain | 34.4 ms | 50.6 ms | 25.9 ms |

Run to run the same build differs by up to sixty per cent, and both runs are far
above the figures published for a build without Peblos in it. Nothing in this
branch can account for Luscia taking 53 ms in one run and 32 ms in the next; the
machine can. A fifteen per cent budget cannot be judged with an instrument that
noisy, which is why the submitted-geometry measurement below was made instead: it
is deterministic, it runs on the built world, and it answers the same question
exactly — how much of Peblos is in front of the camera when a traveler is walking
the old road. **The lead should not read the table above as a regression**, and
if a real frame-time comparison is wanted, the base commit and this branch need
measuring back to back on a quiet machine.

## By eye

Reviewed in headless Chrome with SwiftShader from a scratch page using the vendor
import map, since deleted: the quay from the water as the traveler arrives, the
quay from its head, the village from above the bay, the tally shed and its
soldiers, the shrine, the headland light, the view out to Longstone and Gull
Scarp, the seal cove at eye level, the drowned field, Wrack Island, and
Tidehaven's pier with Jess and his boat on it. Seven things were changed
because of what they showed: the reclaimed bay and the leaking village field
above; the island ground was too pale, so the hills and plains tints are darker
and greener; the seals were faceted stone and are now smooth dark hide with a
head up and a flipper, hauled out on the tideline; Cobble's cottages had window
flower boxes; the quay was one blank block and now has courses in its face and a
greyer capping; the corner of the sea plane was in shot from the headland; and
five pines over nine islands read as none, so the rule that places them was
loosened to sixteen.

## What it costs

Peblos is nine hexes of island in a 2 020 × 1 880 m world, and it is cheap.

| | |
| --- | --- |
| Colliders | 8 521 in the world, of which about **260** stand on the islands |
| Peblos's scatter | 16 pines, 96 gorse, 312 rocks, 295 thrift cushions, 971 tufts of salt grass, in **28 instanced batches** — one to five per island |
| Peblos's props | Ten buildings, the quay, the tally, the shrine, the light, the cove, the field and five island landmarks |
| Terrain grid | 403 × 399 → **453 × 399** vertices (+50 columns of the coarse 7.1 m spacing, +12 %), all of it east of the old edge; still tiled 13 × 13 |
| The Stills | Same vertex density (one per 32 m), 450 m further out on every side |

Scatter is batched island by island, so a camera on the mainland submits little
of it. Measured outline to outline, the Pilot's Stone and the Saltings lie 58 m
off Drent's southern coast, Gull Scarp 231 m, Longstone and Wrack Island 252 m,
and Cobble Island itself **404 m** — the last three beyond the fog from any
ground a traveler walks on. The extra terrain columns are all east of x = 290 and
cull with their tiles.

Single frames from the review page (SwiftShader, one render with shadows, no
HUD), for scale against Solis's 128 draws in its market square:

| View | Draws | Triangles |
| --- | --- | --- |
| Arriving at the quay, from the boat | 590 | 197 k |
| The quay head, looking out at Gull Scarp | 606 | 700 k |
| Cobble from above the bay | 913 | 768 k |
| The tally shed and its soldiers | 510 | 191 k |
| The headland, looking north at Longstone | 96 | 137 k |
| The seal cove | 47 | 82 k |

The big triangle counts are the open sea: the Stills are one plane and every one
of its quads is submitted when the camera looks along it. That is the sea's cost
everywhere in the game and not the islands'.

**What Peblos costs the old regions**, measured on the built world by counting
the geometry a camera's frustum intersects with Peblos's groups shown and hidden
— the same method `tests/regions-world.test.js` uses for its batching check, and
a deterministic answer where the traversal's frame times are not:

| Camera | With the islands | Without | Peblos's share |
| --- | --- | --- | --- |
| Tidehaven's pier, looking east at them | 92 draws / 292 k | 70 / 277 k | +22 draws, +15 k |
| Tidehaven's green, looking east | 129 / 314 k | 103 / 299 k | +26, +15 k |
| The Avrel clearing, looking east | 397 / 630 k | 371 / 621 k | +26, +9 k |
| The Caloss crossing, looking east | 519 / 723 k | 501 / 718 k | +18, +5 k |
| The Caloss crossing, looking west | 137 / 210 k | 137 / 210 k | **none** |
| Lumber Town, looking east | 337 / 627 k | 333 / 625 k | +4, +2 k |
| The Tessen bridge, looking south | 459 / 614 k | 414 / 596 k | +45, +18 k |

Looking away from the sea it is nothing at all. Looking toward it, the worst case
is 45 draw calls and 18 000 triangles — eleven per cent more draws and three per
cent more triangles — and most of that is island scatter 400 to 570 m away that
the fog has made invisible two hundred metres earlier. Nothing in this game culls
by distance inside the 650 m far plane; that is the price every far region pays,
and Peblos pays the same one.

## Left as stubs

- **The five outer islands have no crossing.** Terrain, scatter and one landmark
  each, seen across the water. What each would want:
  - **Longstone** — the Empire's beacon relit, or a reason it is not: the natural
    home for the naval station `campaign-design.md` gives Peblos, with a slip, a
    store and a signal officer who wants the light kept.
  - **Gull Scarp** — an egging ledge and the argument about who may climb it; a
    boy who does it anyway. The gulls are already there.
  - **The Pilot's Stone** — Old Pell's own ground, and the place to teach the
    channels: a short piloting errand out of Tidehaven that is really a lesson.
  - **Wrack Island** — the *Sea-Mare*: what Cobble took off her, what the tally
    says it took, and who else remembers. The first quest the seam could carry.
  - **The Saltings** — summer salt work, the pans, and the one Peblos trade the
    Empire does not count. The sea cave and the hidden rebel ship belong out
    here, on the westernmost Pebble, furthest from the tally shed.
- **No quest, no pirates, no naval station, no sea cave.** The brief asked for
  none, and level 1 asked for nothing that can kill.
- **Nothing to buy or sell on the quay.** No inn, no interiors, no work.
- **No boats but the ferryman's move.** The hulls are hauled out; the fishing
  fleet is at sea and stays there.
- **No fishing spot.** The Caloss and the Tessen have banks; the Pebbles have a
  whole sea and no rod stand on it.
- Peblos's ground is coarse terrain grid (7.1 m outside the fine band), like
  Rimeholt's and Solis's. The terrace is planar, so the village floor is exact;
  the feather is sampled across three cells and the error under a plinth is a few
  centimetres.
- The README's district table, its region blurbs and `CLAUDE.md`'s "four playable
  regions" describe four regions; they described four before this branch too.

## For the lead, on merge

- **Regenerate `src/region-survey.js`** if another region lands at the same time
  (`node scripts/build-region-survey.mjs`); `tests/region-survey.test.js` catches
  a stale file.
- **Region ids.** Peblos took **7** in `REGION_IDS`. Nothing assumes it except
  that entry; everything else derives from the registry.
- **Shared lines likely to conflict**, each a one-entry addition:
  `PLAYABLE_REGIONS`, `PLAYABLE` in the survey script, `REGION_BIOMES`,
  `REGION_IDS`, `REGION_TERRAIN`, `REGION_TEXT`, `TERRAIN_PADS`,
  `REGION_CLEARINGS` in `world-regions.js`, `roadSignLabels` in `world.js`
  (the sign atlas holds 27 rows and now uses 26), `BUILD_STATUS`, `SUBREGIONS`,
  `LOCALS` in `developer-atlas.js`, the travel points in `developer-mode.js`, and
  `package.json`'s test list.
- **`src/world.js`**: the new imports sit under Pueth's, the scenery call after
  `bridgeDecks.push(puethScenery.bridge)`, and `mapLands` just above
  `worldSpawn`. Three older lines changed: `heightAt` (the quay deck), the shore
  trace (skipping the islands) and the sea plane's size.
- **`src/main.js`**: the ferry is created straight after `createAftermathChapter`,
  the conversation hook straight after Pueth's, the frame hook after the
  occupation pass, and `saveRoad`/`continueRoad` each gained one clause.
- **`villageWeight` changed** (`src/world-terrain.js`). Anything that samples
  Tidehaven's height field east of world x 36 now gets the ordinary sea floor.
  The Pueth work's `TIDEHAVEN_GROUND_REACH` and its test are unaffected: that
  constant is about the field's *sideways* reach, which is unchanged.
- **`cottage()` gained a tenth argument** (`{ plain }`), defaulting to the old
  behaviour. Rimeholt and Tidehaven are untouched.
- **The charts gained `lands`.** `local-map-data.js` passes `world.mapLands`
  through to the trail chart and the minimap draws it after the water. Any other
  region that is an island, or has one offshore, gets the same for free by
  putting its outline in `world.mapLands`.
- **Nothing in `src/world-scale.js` changed**, and no cluster was added.
- The branch is four commits on `peblos` and has not been pushed.
