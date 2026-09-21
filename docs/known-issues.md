# Known issues

Things that are wrong, reproduced and measured, with where to look. Each one says what is
actually happening rather than what it looks like, so that whoever picks it up does not have to
re-derive it from a screenshot.

---

## The ground you stand on and the ground you see disagree at city terraces

**Seen:** riding along the lake shore below Ambron (Elagos, by the Drowned Causeway), the horse
and rider are buried to the chest in the bank. The rider sits above a flat tan wedge of terrain
and the horse's body is inside it.

**It is not the horse.** The mount is standing exactly where the game thinks the ground is. The
drawn ground is somewhere else.

**Measured.** At `(-1252, 353)`, just outside Ambron's south wall:

| | height |
|---|---|
| `world.heightAt` — where the player stands, and what every collision uses | **0.65 m** (lake level) |
| the terrain triangle drawn at that point | **10.73 m** |
| difference | **10.08 m** |

So the traveler is ten metres inside the visible bank. Anywhere along the foot of that wall is
somewhere between fine and ten metres wrong.

**Cause.** Two different surfaces:

- `heightAt` is analytic. `AMBRON_TERRACE` (`src/region-world.js`) is a pad at level 17.2 with a
  30 m feather, and near the wall it goes from lake level to city level over a very short run.
- The terrain *mesh* is a grid built by `axisSamples` in `src/world.js`. That function only
  spaces vertices 2.5 m apart inside one fine band — the one around Tidehaven and the Avrel
  clearing — and coarsens to **7.1 m everywhere else**, which is all of Elagos.

A 7.1 m triangle cannot hold a step that tall. It smears the terrace wall across one cell, and
in the middle of that cell the drawn surface is ~10 m above the surface you walk on.

It is not only Ambron: the same measurement around Tidehaven, inside the *fine* band, still finds
4.6 m of disagreement at the nearest hard edge. Every terrain pad in `TERRAIN_PADS` has the same
shape of problem; Ambron is the worst because it is the tallest pad and the furthest from the fine
band.

**How far it reaches.** Measured against the renderer's own grid (see `tests/drawn-ground.test.js`):
of the 155 people the world places and the 140 places it names, **none** is buried by more than a
metre, and of 3,411 samples along the 1.7 km main road only nine are, in one 4 m stretch at the
road's west end on the Moros Plain where the drawn ground stands 1.85 m over the walkable ground.
So this is a problem of shorelines and terrace walls, not of the ground the game sends people to;
it is worth fixing for how it looks, and it is not blocking anybody today.

**Ways out, roughly in order of how much they cost:**

1. Give `axisSamples` a list of fine windows instead of one, and include a band around every pad
   edge in `TERRAIN_PADS` (plus `AMBRON_TERRACE`). Fixes the cause everywhere. Costs vertices —
   needs a count before and after, because this is the world's single biggest geometry.
2. Widen the feather on the pads that sit on a shore, so the analytic step is gentle enough for a
   7.1 m grid to follow. Cheap, changes how the cities sit in their landscape.
3. Build the pad edges as their own geometry (a retaining wall / revetment) and let the terrain
   stay coarse behind it. Most control, most work, and arguably the right answer for a city that
   is *supposed* to stand on made ground with a wall around it.

**Repro:** ride south-east out of Ambron toward the Drowned Causeway and follow the water's edge
under the south wall.

---

## A tumbled cart sits on a track, not beside it

**Seen:** walking the short spur that leaves the Avrel clearing road south-west, the way is shut
by the wreck of a courier's cart, and there is no way through on the track.

**Measured.** The spur is `roadSpurs[0]` in `src/world.js` (`[at(-236, 30), at(-248, 16),
at(-252, 8)]`), drawn 2.2 m wide, 27.4 m long. The cart is the "Tumbled courier cart" in
`src/world-regions.js`, at authored `(-248, 14)`, with a collider of radius 2.3 m.

| | |
|---|---|
| cart centre to the spur's centre line | **0.89 m** |
| the track's half-width | 1.10 m |
| how far the cart's collider covers the centre line | **1.41 m** |
| track impassable | **7.2 m of 27.4 m** |
| how far aside a traveler must go to pass | **3.50 m** from the centre line, so 2.4 m clear of the drawn track, out into the crop field |

Both the cart and the spur's middle vertex are inside the `avrel` world-scale cluster, so they
moved together when the world grew to 100 m per hex: this is how they were authored, not a scaling
accident.

**Why it is a decision and not a slip.** The prop is called a tumbled courier cart. A wreck lying
across a track is a perfectly good thing to put on a track, and the rest of the Avrel clearing is
about an army post and a road. But nothing in the game says so: there is no line about it, no
detour drawn round it, and no quest that reads it. As it stands a traveler meets a piece of
scenery that blocks a road for no stated reason and steps into a field to get round it.

**Ways out:**

1. Move the cart about 2 m off the line, so it lies beside the track with its wheels in the verge.
   One coordinate in `src/world-regions.js`. Keeps the picture, loses the obstruction.
2. Bend the spur round it, which is what a track past a wreck would actually do: one more vertex
   in `roadSpurs[0]`. Keeps the obstruction, and the detour becomes the road.
3. Leave it and give it a reason — a line from Corvan's post, or the courier it belonged to.
   The most content and the best answer if the cart is meant to be noticed.

**Repro:** from the army supply post in the Avrel clearing, follow the short track south-west.

---

## Two fingerposts stand inside things

Fixed already: the post for the Caloss bridge stood in the Caloss. Two more are wrong, and
neither is the road nudge's doing - both are placed by hand in their own region's file.

**Measured.** For each of the 73 signposts the world builds, the nearest ground a traveler can
stand on and read it from:

| post | at | its foot | nearest standable ground | placed by |
|---|---|---|---|---|
| The Quay | -19, 617 (Elod, East Suval) | 7.44 m | **3.5 m away, 1.37 m below** | `src/east-suval-world.js:289`, `sign(S.x + 2.6, S.z + 5.2, ...)` |
| The Stair | -1234, 409 (Elagos) | 13.81 m | 2.5 m away, level | `src/elagos-*` |

The Quay's post is inside a house: the collider is a 3.48 m circle at (-18, 615.5) and the post
is 1.92 m from its centre, so 1.56 m of wall stands through it. Every other post on the road is
within 2 m of ground a traveler can stand on.

**Why they are left alone.** The Quay is inside Elod, and the Elodi border is shut for the whole
main quest (`src/closed-border.js`): nothing behind it is reachable except with the F8 tools, so
the post cannot be seen in ordinary play, and moving it is a decision about Elod's harbour
quarter rather than a slip to correct. The Stair is in Ambron, which is being rebuilt as a lake
city; its ground is moving anyway.

**Ways out:** move each post about 2.5 m onto open ground beside the building it is in - one
offset each - or leave them until their quarter is built and place them with the rest of it.
`tests/signposts.test.js` names both as known exceptions, so whoever moves them will see the
test stop excusing them.

---

## The burying at the Lauvel can be invisible while you are standing in it

**Seen:** Sela hails you from the burial ground, the quest starts, and the side-quest panel goes on
showing a job at the reedcutters' landing a hundred and thirty metres away.

**Measured.** The panel in `updateHUD` (`src/main.js`) is a chain of six sources, each shown only
when every source above it is null. At the Lauvel, which is Luscia, region 2:

| source | at the Lauvel |
|---|---|
| the acorns | never — it needs region 1 |
| `showForestTask` | never — it needs region 1, or Pueth for the goblin camp |
| `regionalTask` | **can be live** — `landing-nets` is a region-2 task |
| `birdTask` | never — region 1 only |
| `letterTask` | never — region 1 only |
| `edTask` | never — West Suval only |
| `katyTask`, which is `burying.task() ?? heist ?? hunt ?? Katy` | last |

So one source can hide the burying, and it is the one whose ground the burying stands on. Driven
against the real module: inspecting the landing workshop makes `landing-nets` ("Two patient knots")
live, and while it is live and incomplete the panel shows it everywhere in Luscia. The workyard is
at (-684, 195) and Sela at (-685, 326): **131 m apart**, both in the same region.

**Why that is worse than an ordering quibble.** The burying has no other surface anywhere in the
interface. `index.html` gives the journal its own sections for the acorns, the wood, the goblin
camp, the Ardry letters, the camp meal, the cape and the regional workyards. There is no section
for the burying, the heist, the hunt or Katy's search: those four exist only in that one HUD line.
When the line is taken, the quest is not merely demoted, it is nowhere.

**Ways out:**

1. Move `burying` up the chain, above `regionalTask`. One line, and it inverts the same problem:
   a regional task at the workyard would then be hidden while you stand in it.
2. Show whichever live task is nearest the traveler, instead of a fixed order. The panel already
   knows every task's region; the tasks would need a point as well, which most of them have.
3. Give the burying — and the heist, the hunt and Katy — a journal section like the others, and
   leave the HUD line as the "nearest one thing" it already is. Most work, and it is the answer
   that scales: the chain is six deep now and every new side quest makes it deeper.

**Repro:** inspect the landing workshop in Luscia to start `landing-nets`, then walk up the road to
the Lauvel. Sela hails you, the journal has nothing, and the panel says "Two patient knots".

---

## Two assertions still measured against the world's edge, and how much room each has

**The Ela-south one is fixed.** `tests/elagos-world.test.js` asserted the reach's last point was
west of `WORLD_BOUNDS.minX`, which had 15 m of margin against four regions that will move that edge
by hundreds. It now measures against Elagos's own western outline, 75 m away, which is what the
sentence was always about. Two more assertions in the suite have the same shape; neither is wrong
today, and both are recorded here with their margins so nobody meets them by surprise.

**1. `tests/region-layout.test.js:73` — the world's total size is a budget, and it is nearly spent.**

```js
assert.ok(bounds.maxX - bounds.minX < 25 * METRES_PER_HEX && bounds.maxZ - bounds.minZ < 32 * METRES_PER_HEX,
  'the playable regions fit a walkable world');
```

| | now | limit | room left |
|---|---|---|---|
| east to west | 2,220 m = **22.20 hexes** | 25 | **280 m** |
| north to south | 3,093 m = **30.93 hexes** | 32 | 107 m |

Four regions to the west will use more than 280 m — Elagos alone is 700 m across. Unlike the
Ela-south, this assertion is **not** mistaken: it is a deliberate budget on how far a traveler can
be asked to walk, and the failure will be telling the truth. Whoever lands the western regions
should raise the number on purpose and say what the new budget is, rather than treat it as a broken
test. Note it only measures the *playable* regions, so unbuilt country to the west costs nothing
until it is playable.

**2. `tests/peblos-world.test.js:79` — the tightest margin in the suite, on the other side.**

```js
assert.ok(Math.max(...REGION_OUTLINES.Peblos.flat().map(point => point.x)) > WORLD_BOUNDS.maxX - 120,
  'and the outermost Pebble is still near its eastern edge');
```

Peblos's east edge is at x = 500 and `WORLD_BOUNDS.maxX - 120` is 490: **10 m of margin**, tighter
than the Ela-south's 15. It is safe for now because the four new regions are *west*, and `maxX` does
not move when the world grows westward — and it has already survived one eastward extension, since
West Izol is what pushed `maxX` out to 610 and it held with those 10 m. But anything added east of
West Izol breaks it.

Left alone rather than repaired, because unlike the river there is no obviously better thing to
measure: "near its eastern edge" is a claim about the world's edge, and what it should mean once
something lies further east again is a question for whoever puts it there.

## The developer tools are a headline feature of the title screen

**Not a bug today.** This is written down because the game is being considered as a public static
site, and on that day this stops being a convenience and becomes the first thing a visitor sees.

**Measured.** The testing surface has three doors, and only one of them is gated:

| door | gate |
|---|---|
| `window.__AZHORA__` (`review`, `runSmoke`, every driver) | `?test=1` — `src/main.js:2748` |
| the **F8** key | **none** — `src/main.js:2212`, five hundred lines outside that gate |
| two buttons in the ordinary interface | **none** |

The two buttons are not hidden and nothing ever hides them (`show('testing-badge', …)` is the only
thing toggled):

- on the **opening screen**, beside "Continue adventure": `Explore testing tools  F8`
- in the **pause menu**: `Testing tools · F8`

What opens is headed **"FOUR REGIONS · PLAYTESTING"** — "Try the new things." — and offers twenty-two
controls, including:

- `Ghost view developer · atlas / free flight` — the World Builder hex atlas and a free camera
- `Developer chart: reveal the whole map`
- `Skip tutorial & give camp supplies`
- `Elod · East Suval, behind the gate` — into the region the main quest spends its length keeping shut
- travel to Peblos, Izolveth, Luscia, the Moros Plain, East Suval and Elagos · Ambron

`src/build-status.js` describes several of those as unfinished in its own words — East Suval is
"a way in… No quest, no trade, no interiors." The tools are a door straight into them.

**What is not wrong.** Two things worth saying, because they are the parts that would actually
matter and they are already right:

1. **A testing session cannot touch a real save.** Every travel button goes through `testTravel`,
   which calls `prepareTesting()` and sets `testingEnabled`, and `saveRoad` refuses outright while
   that is set (`src/main.js:1552`). `Developer chart: reveal the whole map` toggles a view-only
   `chartRevealed` flag and never touches `mapFog`, so it is not written to the chart either.
2. **The browser fallback is already clean.** `roadStorage = window.azhoraRoadStorage || localStorage`
   inside a `try`, so a build with no Electron preload saves to localStorage and a build with storage
   disabled still plays.

So there is nothing here that corrupts a player's game or reaches beyond their own browser. The cost
is presentational: an unfinished-build vocabulary on the title screen, and a spoiler door into
regions the story has not opened yet.

**Ways out, in order of how little they cost:**

1. Hide the two buttons and ignore F8 unless `?test=1` is present — the gate that already exists for
   `window.__AZHORA__`, applied to the other two doors. The smoke tests all run with `?test=1`, so
   nothing in the harness changes. One condition, two `hidden` attributes.
2. Keep F8 as an undocumented key and hide only the buttons. Playtesters keep their shortcut; a
   visitor is not invited.
3. Leave it, and treat the tools as part of what is being shown. That is a real choice for a game
   posted as a work in progress — but it should be a choice, and the panel's wording would want to
   change, because "FOUR REGIONS · PLAYTESTING" is addressed to the person building it.

**Repro:** open the game, press F8, or read the opening screen.

---

## Ammi Tal cannot be reached from anywhere in the world

**Seen:** nothing, and that is the shape of it. She is at Sevenwalls, she has a name, a model, a
role and three paragraphs about walls and soil and going down to Elod twice a year with oil, and
there is no way to walk to her.

**Measured.** A flood fill of the whole world from the landing at Tidehaven, one metre a cell,
using exactly the rule `moveCharacter` enforces (`canStand` at the traveler's own footprint):

| | |
|---|---|
| cells the traveler can reach on foot | **3,369,563** of 6.9M |
| people the fill reaches | 118 of 155 |
| people it does not | 37 |

Thirty-six of those thirty-seven are on islands — eleven in Peblos, twenty-five in West Izol —
and are meant to be reached by boat. The thirty-seventh is **`suval-terrace-farmer`, Ammi Tal**,
at (-205, 696), on ground the fill otherwise walks all over.

Filling locally instead, from open hillside sixty metres out, reaches 499,778 cells and still does
not reach her. The pocket she stands in is **163 cells of a quarter metre — about ten square
metres**, running 3.3 m by 7.5 m, and it does not touch the edge of a 120 m box drawn around her.

**Why every other check passed her.** They are all local. The ground under her holds a body, and
there is standable ground in a ring around her — because the ring is inside the pocket with her.

**What seals it.** Firing 720 rays outward and recording what stops each one: 685 hit a scattered
prop, 241 a hut, 73 the cistern, 9 a field wall. There are **116 props within nine metres of her**.
Take the props within twelve metres away and the ground opens: the same fill escapes instead of
closing at 39 cells.

**Why `keepPropsClear` did not save her.** It removes a prop whose centre is within its own radius
plus eight tenths of a metre of somewhere somebody stands. That is the *spot*, not the way out. Of
the 116 props around her it reaches **none**; the nearest one it cannot reach is **0.98 m** away, a
centimetre past its clearance.

**And widening it is not the repair.** Prop counts within nine metres of a stand, across all 155
people: median 4, upper quartile 51, ninetieth percentile 115, highest **441**. Twenty-six people
have more than eighty props that close and are perfectly fine — `peblos-legionary-2` has 441 and
opens out. Density is not the fault; the fault is the particular ring of props, three huts, a
cistern and a terrace wall at Sevenwalls. A bigger clearance would strip scenery across the whole
game to mend one place.

**Ways out, all local:**

1. Move her. The nearest ground that is both reachable and has room to be spoken in is **6.25 m**
   away, around (-208.1, 701.4), in the lane between the second and third huts. There are 3,831
   reachable, roomy spots within twenty metres, so this is one coordinate in
   `EAST_SUVAL_STANDS` (`src/east-suval.js:291`) once somebody chooses. Not guessed at here
   because which of those spots is *her* spot is a staging choice: she is a terrace farmer, and
   the lane between the huts is not the terrace.
2. Thin the scatter at Sevenwalls, so the hamlet has gaps between its buildings. Keeps her where
   she was put, and is the answer if the pocket is a scattering accident rather than her placement.
3. Give `keepPropsClear` a second job: clear a corridor from each stand to open ground, rather
   than a disc around it. Fixes the class instead of the instance, costs the most, and needs a
   before-and-after prop count because it touches every stand in the world.

**Repro:** `tests/nobody-sealed-in.test.js` names her; F8 to East Suval and walk to Sevenwalls.

## Five of the ten hired swords wait on the harbour floor (fixed)

**Fixed 2026-09-21: they queue down the pier.** The ring is gone. `placements()` now puts a
waiting man in a line running from the landing toward the road's own first point - which at
Tidehaven is straight down the deck - at `LANDING_QUEUE` (lead 2.4 m, spacing 1.9 m, alternating
0.45 m either side of the line so the traveler can walk up through them). The numbers were
measured against the built pier: of the shapes that put all eleven on standable ground, this is
the one leaving the most room around the tightest man, 0.8 m of clear ring where three of them
pass a bollard. Nobody stands in water in any phase, and the whole sweep - 46,371 placements over
25,000 seconds - is checked in `tests/nobody-sealed-in.test.js`, whose tripwire is turned over
to say so. The staging choice was the user's: option 1, the queue, "it keeps the picture of
people stepping off a boat".

**While checking it, a smaller thing — and one half of it turned out to matter.** A man's home
can land inside a collider, because the lateral offset is up to 4.6 m walking and 10.1 m stopped.
The 8% ceiling first written here was over both phases together and hid the difference between
them: **walking is 56 of 2,192 (2.6%) and harmless** — the home moves every frame and
`stepAround` has him past the thing in a second — but **stopped was 78 of 486 (16.2%), and a
stopped man holds his place for 60, 90 or 120 seconds**. Twelve of those were close enough that
`pace` never fell below the tenth of a metre that ends the walk, so the man marched on the spot
against a hedge for the whole dwell, in Lumber Town square and at the crossing. Kristen was one
confirmed case, 0.08 m short of a place she could not reach.

**Fixed 2026-09-21.** `createMercenaryCompany` takes an optional `standable` predicate from the
host, and moves a blocked *stop* place — once, when the formation is laid, out in half-metre
rings, so it is deterministic and the same in every save. Stopped is now **0 of 486**, nothing
else moved by a millimetre, and the ceiling in `tests/nobody-sealed-in.test.js` is split by phase:
landing, stopped and mustered are held at zero and the message names the phase, while walking
keeps a ceiling of 5%. The muster was always clean: 43,171 placements, none blocked.

**Also corrected:** the old test asserted every walking or stopped man stays within 4.2 m of the
road, and sampled one moment (t=1200) to check it. It was not true of the whole clock - Mus walks
4.6 m out and stops 10.1 m out - and no moment it looked at happened to catch him. The corridor
is now stated from the formation itself (`1.4 + floor((n-1)/2) * 0.8`, and 2.2 times that for a
stopped man) and swept over 20,000 seconds.

The measurements below are what it was.



A mercenary who has landed but not yet set off stands in the `landing` phase, and
`placements()` (`src/mercenaries.js`) puts him in a ring around the traveler's own landing
point: `x = start.x + sin(index * 1.9) * (2.2 + index * 0.3)`. `src/main.js:196` passes
`landing: world.spawn`. The ring therefore grows with a man's place in the roster, from 2.2 m
for the first to 4.9 m for the tenth.

**The spawn is on a pier three metres wide.** `world.spawn` is (23, 29) at height 1.80. Mapping
`canStand` at one-metre steps around it, the standable ground is a strip from z=28 to z=30
running west from the pier head at x≈29 back to the shore at x≈9. Everything north of z=27,
south of z=31 and east of x≈29 is water, and the harbour floor there is at **−5.5 m** — five and
a half metres below the sea surface (`SEA_LEVEL` 0.06).

**No ring wider than 1.7 m stays on the pier.** Sweeping radii in 10 cm steps and testing all
32 bearings, the largest fully standable ring around the spawn is **1.7 m**. Eight of the ten
men are placed at 2.2 m or more.

**Who ends up in the water,** with the terrain height under each and how long he is there
(`hidden` is set only for the `coming` phase, so a man in `landing` is drawn and steered):

| | man | ring | position | ground | waits |
|---|---|---|---|---|---|
| 2 | Jerry | 2.8 m | 21.3, 26.8 | −5.56 | 90 s from t=1080 |
| 3 | Kristen | 3.1 m | 21.3, 31.6 | −5.75 | 90 s from t=1080 |
| 5 | Lakota | 3.7 m | 22.7, 25.3 | −5.52 | 60 s from t=1980 |
| 7 | Matt | 4.3 m | 25.9, 32.2 | −5.74 | 120 s from t=3780 |
| 8 | Al the Tun | 4.6 m | 25.2, 25.0 | −5.53 | 120 s from t=3780 |

The other five land on the pier. Chris Gotwood at index 0 needs 2.2 m and his bearing is
standable to exactly 2.2 m, so he is on the edge of it.

**What it looks like in play** depends on where the traveler is, and both readings are wrong.
Past the 180 m view range `src/main.js:2559` snaps a man to his home, so he is teleported onto
the seabed (invisible, since he is also hidden at that range). Inside it, the steering loop
walks him there with `stepAround` (`src/bodies.js:60`), which moves through `moveCharacter` and
so will not enter water, and he presses against the pier edge without ever reaching the spot the
game says he is at.

**Not new.** `git log` on `src/mercenaries.js`: the roster went from eleven to ten at `dff10f0`,
so it shrank rather than grew and the ring's reach came down with it. The formula and the spawn
are untouched, so this has been true since the company was added at `7d76316`.

**The muster is fine.** At the far end all ten stand on dry ground at height ~6.61, between 4.5
and 14.8 m from the camp centre, comfortably inside the 20 m the existing test asks for.

**Ways out:**

1. Wait along the pier instead of around the spawn. The pier is 3 m wide and about 20 m long, so
   a line of ten men at 1.8 m spacing fits on it with room to pass. This is the smallest change
   and it needs one decision: whether the company waits in a queue down the quay or in a huddle
   at its head.
2. Wait on the shore end of the pier, where it meets land at x≈9, and keep the ring. Standable
   ground opens out there, so a 4.9 m ring fits. Costs the picture of men stepping straight off
   a boat.
3. Give `placements()` the ground rule the rest of the game uses: if the chosen spot fails
   `canStand`, spiral out to the nearest spot that passes. Fixes the class — the same ring is
   used wherever a future `landing` is put — but it makes the formation depend on terrain, and a
   drifting formation is a staging decision, not a mechanical one.

Which of the three is right is a staging choice about how the company is meant to look when the
traveler meets it, so it is not guessed at here.

**Repro:** `tests/nobody-sealed-in.test.js` measures the widest ring the landing will take and
asserts somebody is *still* wet, so it fails the moment this is mended. It deliberately does not
name the five, because which man stands at which radius is only the order of the roster. In play:
start a new game, stay at the landing, and wait to t=1080 (eighteen minutes) for Jerry and
Kristen.

## `route` is written on every hired sword and read by nothing (fixed)

**Fixed 2026-09-21. All three of them are read now.**

- `route: 'shore'` — `createMercenaryCompany` takes a `shore` point, and Ed the Word waits on
  the strand the sea put him on rather than among the people who came off boats.
- `swims` — `WORD_SWIMS` in `src/word-arrival.js` is what makes his arrival a crossing to watch
  rather than a man appearing on the sand when the ship lets him go.
- `route: 'wild'` — Mus walks a line of his own, `src/wild-route.js`, by way out 1 below:
  `placements()` picks the polyline and `mercenaryProgress` is untouched, because it was already
  written in distance along *a* path. **1,598 m of authored line, 1,714 m with the muster leg,
  against the road's 1,295, at 0.88 m/s against his own 1.42**, so he musters between minute 32.7
  and 96.7 instead of from 19.8. Every metre was authored against the built world — A* over
  ground `canStand` accepts, with each grid *edge* checked and not only each cell, then simplified
  by taking only shortcuts that are themselves walkable — and **the authored line never comes
  within 62.7 m of the main road**. The muster leg closes to 39.7 m about 41 m out and ends among
  the camp's tents, which is the join and is meant to be near. He waits on his own strand, passes none of the road's
  stops, is never `stopped`, and musters with the company like anybody else.

The user's ruling of 2026-09-20 is kept whole: **his draw is not clipped**, the half-minute
before the traveler included. `tests/wild-route.test.js` holds the law — over both ends of the
draw and 400 seeds, he is never in before minute 30, against a direct traveler's 27.

The clock pin moved as the ruling said it would: the **nine** road men keep theirs, the last of
them at 5,234.5 s, and Mus is pinned separately as a range. On some seeds he is the last man in.

What follows is what it was.



**Half resolved.** `route: 'shore'` is read: `createMercenaryCompany` takes a `shore` point, and
a man whose route is the shore waits there instead of among the people who came off boats. Ed the
Word comes out of the water onto the strand north of the pier and stands on it, which is where
`src/word-arrival.js` puts him and what `tests/word-arrival.test.js` and
`tests/nobody-sealed-in.test.js` check.

`swims` is read too, as of 2026-09-21: `WORD_SWIMS` in `src/word-arrival.js` is what makes his
arrival a crossing to watch rather than a man appearing on the sand when the ship lets him go.
Nobody on the roster is authored without it, but the flag now means something.

What follows is still true of `route: 'wild'` — Mus walks the road like everybody else.


`MERCENARY_ROSTER` gives each man a `route`: the `merc()` factory defaults it to `'road'`
(`src/mercenaries.js:47`), Ed the Word is authored `route: 'shore', swims: true` (line 78) and
Mus is authored `route: 'wild'` (line 120). The doc comment above the roster says "`route` is
how they get to the muster" (line 66).

**Nothing reads it.** Grepping the whole of `src/` and `tests/` for a read of the field: the
only hits are the two authored entries, the factory default and that comment. The three modules
that import from `src/mercenaries.js` — `src/main.js`, `src/road-checkpoint.js` and the two test
files — never mention it. (`src/salt-sultan.js` has a `route` of its own, on a sea port, which
is unrelated.)

**So everyone walks the road.** `mercenaryProgress()` and `placements()` take no branch on
`route`; every man, Mus included, is positioned with `pointAlongRoad(road, progress.distance)`.
Sweeping play time from 0 to 40,000 s and recording which phases each man is ever seen in, Mus
passes through `coming`, `landing`, `walking`, `stopped` and `mustered` exactly like the eight
`route: 'road'` men, pausing at all three road stops, and finishes 14.8 m from the camp centre
in the same formation. Ed the Word does the same; `swims` is read nowhere either.

**Why it is worth a decision rather than a fix.** The commit that introduced it is called
"Eleven of us for one border, and one of them does not use the road" (`dff10f0`), so the
intent is on the record and the code does not yet carry it. What a wild route *is* — a
polyline of his own, an offset from the road, a cross-country line from a beach of his own to
the camp — is the whole of the feature, and guessing it would invent a route rather than
implement one.

**Ways out:**

1. Give a `route` its own polyline, the way the road is one, and have `placements()` pick the
   polyline by `route` and keep everything else. Mus walks his line, Ed walks the shore, and
   `mercenaryProgress` is unchanged because it is already expressed in distance along *a* path.
2. Drop the field and the comment until there is a route to put behind them, so the roster does
   not promise something the game does not do.

**Repro:** no test covers it. `MERCENARY_ROSTER.every(m => m.route)` is true; nothing else in
the tree mentions the field.

## The Moros Horizon fence now stands inside Nesdor

**DECIDED 2026-09-20, and done: option 3, keep it and mean it.** It stays where it is as the
army's line: an Ambroni line inside a country the Empire does not hold
(`docs/design-answers.md`). Nothing moved. Its name (`FRONTIER.name`, now "The Army’s Line"), its
caption, the build-status sentence and the comments that called it the world's end were
reworded, and `tests/regions-world.test.js` asserts the old wording is gone. The minimap draws
it as an unlabelled stroke, so there was no label text to change. What follows is kept as the
record of why, and quotes the wording as it was.

`FRONTIER` (`src/region-world.js:544`, "The Moros Horizon", region name "The open road west
across the Moros") was the end of the built world: a rope fence west of the army camp, built by
`src/world-regions.js:690` as posts every 8 m over 344 m of z with rope between them, and one
collider 0.2 m thick by 344 m long (`kind: 'frontier'`). Since `bd2d213` there is a country west
of it.

**Where it stands.** The line is at x = −1396.4, z 430.2 to 774.2. Sampling every 8 m along it
and asking which region lies three metres to either side: 35 of 44 samples, **272 m of the 344**,
have Nesdor on *both* sides; 7 samples (z 438–486, 56 m) have the Moros Plain on both sides; one
has Nesdor west and the plain east; the northernmost has Elagos to the west. Walking west along
fixed rows until `insideRegion('Moros Plain')` fails: at z = 450 the plain ends 4 m *west* of the
fence, so there the fence is just inside the plain; at z = 500 the plain ends 12 m east of it; at
z = 600, **85 m** east; at z = 700 and 760 the plain is not on the row at all. The marker point
itself (−1385.7, 602.2) is 74 m inside Nesdor.

**It is solid, and it can be walked round.** `canStand` is blocked within ±0.2 m of the line and
`moveCharacter` walking west in 5 cm steps stops 0.45 m east of it (body 0.34 + half-width 0.1),
at every row sampled inside the span. A breadth-first fill of standable ground from the Moros
side at mid-fence, at 1 m with a midpoint check so the 0.2 m wall cannot be hopped, first steps
over the line at z = 775.2 — **round the south end, 1.0 m past the last post** — after 28,578
cells; the ground beyond the north end is standable at every offset too. Both sides of the line
are standable at 38 of the 44 samples; the other six are water or scatter, not the fence.

**What it cuts off: nothing that has been built.** No path crosses the line inside its span
(there is no Nesdor Way yet). Nesdor has no people placed. All five of Nesdor's landmarks (the
Flats, the Braided Water, the Valley Head, the Carica Corridor, the Upper Carica) are west of
it. Nothing ever opens or removes it: the only reader of `world.frontier` is the minimap
(`src/minimap.js:230`), which draws it.

**What the player meets.** Walking west off the plain, the region card fires "Nesdor" between
12 and 85+ metres *before* a rope line that says the world ends here, and a ten-second walk
along it leads round the end into the same open country. It is the Moros chapter's furniture
standing in someone else's region.

**Ways out, all story calls:**

1. Take it down: the built world no longer ends there, and `regionName` "The open road west
   across the Moros" is now false in fact.
2. Re-site it on the plain's actual western boundary. That boundary is not a line: it runs from
   about (−1400, 450) to (−1311, 600) and is east of x = −1276 by z = 700, so a straight 344 m
   fence cannot lie on it. It would have to follow the outline, or shrink to a short gate on
   whatever road the Nesdor Way becomes.
3. Keep it where it is and mean it: the *army's* horizon, an Ambroni line inside a country it
   does not hold, with the name and minimap label reworded to say so. Costs nothing on the
   ground and is the reading the build-status text already gives ("still stands between this
   region and the plain").

Which of these is right depends on what the Moros chapter wants the traveler to feel at the
far side of the plain, so it is not guessed at here.

**Repro:** no test covers it. Headless: build the world, take `FRONTIER.barrierX`, and sample
`hexOwnerAt(barrierX ± 3, z)` along the span. In play: cross the plain west from the army camp
and watch the card change before the fence.

## Half of the walkable west lies outside every region, and the card named it anyway (fixed)

**DECIDED 2026-09-20: option 3, "open country".** `regionAt` stops snapping: off every outline
it answers nothing, or an open-country sentinel, and the card, the minimap caption, the
autosave-on-enter, the map tutorial's first-province check and the chart all say so
(`docs/design-answers.md`). The ground does not change. Not done yet: it belongs to the
builder, with the cartography work. What follows is the baseline that change is measured
against.

Flooding standable ground from Ambron on foot (`canStand`, traveler radius, one-metre cells with
a midpoint check) across the whole western extent — x −2310 to −1100, z −868 to 2225 — reaches
2,709,151 cells. Sampling every fourth cell each way: **79,957 samples inside some region
outline, 89,584 outside every outline.** That is **52.8% of everything the traveler can walk to
in the west**, about 143 hectares, on ground no `REGION_OUTLINES` polygon owns.

**Where it is.** The four new regions' outlines stop well short of the world's bounds, and the
ground carries on to the bounds on every side:

| the card says | samples | about | extent | furthest from that region's outline |
|---|---|---|---|---|
| Nesdor | 45,405 | 73 ha | x −2245..−1101, z 620..1960 | **1,009 m**, at (−1150, 1960) |
| Vastos | 17,072 | 27 ha | x −2310..−1301, z −868..−468 | 577 m, at the north-west corner |
| Caricas | 15,754 | 25 ha | x −2310..−1821, z −320..1092 | 606 m, at (−2250, 1092) |
| Meneth | 8,590 | 14 ha | x −2310..−1853, z −728..−204 | 505 m, at the west edge |
| Amod | 2,521 | 4 ha | x −1418..−1101, z −868..−608 | 235 m |
| West Izol | 151 | — | x −1146..−1101, z 1904..1988 | **1,011 m** |
| Moros Plain | 91 | — | x −1146..−1101, z 840..892 | 55 m |

Nesdor's outline ends at z = 953; walkable ground the card calls Nesdor runs a kilometre further
south. West Izol is an island on the far side of the map, and its name is what the card shows
at (−1146, 1964).

**Why the card says anything.** `regionAt` (`src/region-world.js:663`) is total: a point whose
hex has no owner is given the nearest region rather than none. Inside the outlines that is
harmless — on owned ground the hex owner and the polygon agree at 62,249 of 62,249 samples in
the west, and the softened chart border never strays more than 3.1 m from the hex outline. Off
the outlines it names ground after a region the traveler is not in, and `subregionsAt`, which is
by distance, mostly names nothing, so the journal goes quiet while the card does not.

**The Lizeem is part of it.** The chart says of the Lizeem Bank that the river is "not
crossable by anybody on foot for the whole of its length here", and of the Bend that "the far
bank is another country and there is no way to it here". As built, the river's deep water on the
Caricas bank is 871 `west-deep-water` colliders spanning **z −117 to 491** — 608 m of bank —
and walkable ground is reached *west* of that water on **all 79** sampled rows of its span,
because both ends are open: 178 rows north and south of it (z −868 to 1180) reach past
x = −2200 with no river collider within 12 m. Walking straight west at z = 200 the water stops
you at x = −2240; walking round either end does not. The Bend's water stops a westward walk at
x = −1685 on z = 800, and the fill still reaches x = −2245 on rows the card calls Nesdor, so the
Bend is got round as well; where it is got round was not measured. The far bank is reachable,
and it is some of the 143 hectares above.

**Not new in kind, new in size.** The same class was measured in round four on the older
regions, where the unowned ground was slivers at polygon edges. In the west it is the majority
of the walkable country, because the four regions were built as terrain over the atlas hexes
they own while the height field, the scatter and `WORLD_BOUNDS` extend to the map's edge.

**Ways out, and each is a decision about where the world ends:**

1. End the ground at the outlines: sea, cliff or the deep-water collider the Lizeem already
   uses, so that a walker cannot leave the country the atlas draws. Costs shoreline and
   scenery work along roughly 4 km of outline, and Nesdor's lore ("an open horizon that goes
   on being open") argues against a hard edge on its south.
2. Own it: extend the four outlines to the bounds the ground already reaches, so the atlas,
   the card and the chart agree with the feet. Cheapest, but it makes the atlas say something
   the World Builder map does not.
3. Name it honestly: make `regionAt` return null, or a sentinel "open country", off every
   outline, and teach the card and chart to say so. One function and its readers (the card,
   the minimap caption, the autosave-on-enter, the map tutorial's first-province check), and
   the world's shape does not change.

Which of the three is right depends on whether the map's edge is meant to be walkable at all,
so it is not guessed at here.

**Resolved, option 3.** `regionAt` no longer guesses: a point whose hex no region owns answers
`OPEN_COUNTRY` (`src/region-world.js`), a region-shaped sentinel with id 0 and the name
"Open country", so every one of its twenty-seven readers goes on working and none of them
borrows a neighbour's name. The region card names it and says OUTSIDE EVERY BORDER THE ATLAS
DRAWS, the kicker says NO COUNTRY CLAIMS THIS, the minimap carries `open`, the map tutorial's
first-province check wants an id above nought so that walking off the atlas is not arriving
somewhere, and the chart of countries (`src/cartography.js`) never records it, because it is not
a country. Scenery batching keeps its old district for it (`?.id || 1`). The ground itself did
not change.

Two more the sentinel exposed, fixed with it. **Sound:** `roadAudioProfile` fell back to region 1
for anything that was not a positive id, so open country - id 0 - would have played Drent's forest
bed (0.065) a kilometre south of Nesdor. Id 0 is a region like any other now and simply has no bed:
no sea, no forest, no field, no river, no ridge, and earth underfoot. Anything missing or
nonsensical still falls back to 1 as it always did. **The trails tab:** `buildLocalMapModel` used
the snapped region and, with the sentinel, would have defaulted to Drent's sheet from the far west.
It opens the *nearest* region's sheet instead, sets `outside: true`, and the caption says "You are
outside every border the atlas draws. This is the nearest sheet, X, and you are off it." The player
marker is not drawn when he is off the sheet, which `trailMapSVG`'s own `visible()` already
ensured; nothing is clamped onto a border to pretend otherwise.

Two things the old snapping had been hiding came out with it, both fixed here: the
`lizeem-bend` named area stood 30 m outside Nesdor with 27% of its disc on owned ground, and
`vastos-braids` was 55% inside Vastos - both moved to the nearest centre whose whole disc is
inside its own region, 117 m and 85 m respectively. And West Izol's spawn, which the testing
panel's "Sail to Izolveth" uses, was five metres off the island's own outline; it is on the
island now. `tests/map-fog.test.js` checks every named area's centre against its region's outline
rather than against `regionAt`, and `tests/open-country.test.js` holds the four worst points the
survey above measured.

**Amended 2026-09-21: a shore fringe, and the figure above moves with it.** The sentinel was
right about the west and wrong about a country's own coast. The atlas is drawn in 100 m hexes
and the world is built in metres, so Drent's beach runs on east of the last hex Drent owns:
south of Tidehaven the atlas ends Drent at about x = 0 for every z from 74 to 140, while the
strand the traveler walks carries on past it. **1,055 standable cells of Drent's own shore sat
on hexes Drent does not own**, among them 1,282 half-metre samples of the Weatherhead's disc,
where Cabe sits and smokes — so a man on Tidehaven's beach, in sight of the pier, was told he
was in no country at all (`tests/botany.test.js`, "Cabe sits on the Weatherhead", went red on
exactly that). The user's ruling was about the unowned west, up to a kilometre past the
outlines, not about a sliver of a country's own shore.

So `regionAt` now gives a point whose hex nobody owns to the country beside it when it lies
within **`SHORE_FRINGE` = 76 m of that hex's centre** — 26 m of fringe past a flat edge, about a
quarter of a hex, less past a corner. 76 m is the measurement and not a guess: it is the
smallest whole metre that takes in every standable cell of Drent's built coast, the worst being
the south-east strand at (25, 127), **75.86 m** from the nearest Drent hex centre; the
Weatherhead's standable disc needs 66.61 m and its stand 55.23 m. Only the six neighbouring
hexes are consulted, which is provably enough: a point is never more than one circumradius
(57.74 m) from its own hex's centre, so nothing two rings out can be within 115.5 m.

It does not give the west its names back — that ground is hundreds of metres past the outlines,
not tens — and every point pinned above is still open country. **The figure does move, and this
is the new one:** re-sampling the same box (x −2310..−1100, z −868..2225, every fourth metre,
`canStand` at the traveler's radius) gives 170,324 standable samples, of which **85,921 lie
outside every outline: 50.4%**, where before the fringe the same sweep gave 90,415 of 170,324,
**53.1%**. The fringe reclaims 4,494 samples, 2.6 points of the figure, and all of it is coast.
(The 52.8% at the head of this entry is the original flood-fill from Ambron, 89,584 of 169,541;
the sweep above reproduces it to within a third of a point without the reachability pass.)
**The fringe is what the traveler is told, and nothing else.** `regionAt` carries it;
`hexOwnerAt` does not, and the two now differ on purpose. That second function was called
`regionNameAt` until the fringe landed, which was a name that claimed it was `regionAt(x, z)`
with the object unwrapped; it was renamed across all 112 mentions the day after, and the built
world did not move by a collider. Every caller of `hexOwnerAt` in `src/` is a scatter filter — `west-regions-scenery.js`, `amod-scenery.js`, `pueth-scenery.js`,
`east-suval-world.js`, `world-regions.js`, `west-suval.js`, `west-regions.js`, `rena.js` — and
each asks whose hex this is so that Caricas's forest goes on Caricas's hexes. Handing them the
fringe re-seeds all of them: measured, **about 4,700 colliders moved across the west**, because
a rejected candidate still advances the seeded stream, and the retuned western animals are
tuned against the scatter as it stands — `tests/west-life.test.js` went red on a fox that could
be walked down. With the split, the built world is **byte-identical** to before the fringe:
33,131 colliders, same positions, same radii, same kinds. `insideRegion` is untouched and still
strict — it promises no fringe and its callers rely on that — and `tests/open-country.test.js`
holds both halves: the shore (the Weatherhead's whole standable disc is Drent, no standable step
of the strand at z = 104, 120 or 127 is nowhere, the sea and the west still are) and the split
itself (on a region's own hexes the two functions never disagree, and no scatter module may
quietly move to `regionAt`).

**Repro:** no test covers it. Headless: flood from Ambron as above and count reached cells for
which no `insideRegion` is true. In play: walk south off the Nesdor Flats and keep going; the
card still says Nesdor a kilometre later.

---

## "Speak with Iven" at a cart two hundred metres from Iven (fixed)

**Seen:** the approved walkthrough, `npm run test:game`, fails at one step:

```
Road smoke: the satchel prompt is missing at the wrecked cart; the label reads
"Speak with Iven" and within six metres stands: nobody
```

The stage is `find-satchel`, the objective `courier-satchel`, the traveler at the Lauvel field,
and Iven is back in Lumber Town. So a talk prompt appeared to be showing where the man is not,
and beating the cart's own prompt. Two hunters chased that reading — a hired sword stopped at
the cart, then the companion still escorting — and both were dead ends, because the reading was
wrong. Nobody was answering. Nothing was on the screen at all.

**Cause: Sela.** `src/main.js:3339` hails the traveler the moment they come inside `HAIL_FROM`,
and the hail is not a toast, it is `openDialogue`, which sets `mode='dialogue'` and calls
`show('interaction',false)` on the spot. The cart is inside her call:

| | |
|---|---|
| `HAIL_FROM` (`src/lauvel-burying.js:41`) | (−685.09, 325.72), reach **34 m** |
| `courier-satchel` (`src/luscia-chapter.js:32`) | (−678.29, 297.92) |
| where the walkthrough stands | (−677.79, 297.12) |
| between them | **29.5 m** — inside her call |

So the warp to the cart is also the step that hails her, on the first frame after it. The state
dump agrees: `mode: 'dialogue'` and `burying: { stage: 'hailed' }`.

**And then the label lied.** The panel is hidden, but `#interaction-label` is the one piece of
HUD text nothing ever cleared. Every line that writes it (`src/main.js:3427–3446`) is gated on
`mode==='playing'`, or on a `current*Site` that is itself null outside play (`3405–3411`), so
in dialogue mode nothing writes over it and it keeps the last thing it offered — "Speak with
Iven", from the relay hut two hundred metres back, written the frame before the traveler was
warped away. The walkthrough read it, saw a name, and reported a talk prompt.

**How bad, for a player: not at all.** `show` is `classList.toggle('hidden')`
(`src/main.js:158`), so the stale words are behind `display:none`; and within a frame `show` and
the label are written in that order with no paint between them, so there is no flash when a
conversation ends either. This is a bug that lies to whoever asks the HUD what it is offering,
and what it cost was two days of two bug hunts.

**Could a player reach the cart without being hailed first?** No, and it does not matter that
they cannot. Coming up the road from Lumber Town the hail fires forty-odd metres out, long
before the cart; coming across country from the north-east it fires as they step onto the cart.
Either way they hear her, control comes back, and the prompt is correct. Only a harness that
warps in and reads the same frame sees the stale line.

**Fixed, two lines and a test each.**

- `src/main.js`: the panel and its words are now one decision. `const prompting = …;
  show('interaction',prompting);` and, after everything that writes the label,
  `if(!prompting)$('interaction-label').textContent='';`.
- `src/road-smoke.js`: the cart step hears her out first, the way a player does, and its failure
  message names the mode.
- `tests/prompt-priority.test.js`: the panel and the words are decided by one value and the clear
  is the last word on the label.
- `tests/lauvel-burying.test.js`: the cart stands inside her call, and the walkthrough's cart step
  finishes the conversation before it reads the prompt. Against the old `road-smoke.js` that
  assertion fails, which is what it is for.

**Repro:** stand at (−677.79, 297.12) with the burying at `unknown` and read
`#interaction-label` on the next frame. Pure: `Math.hypot` of `HAIL_FROM` against
`LUSCIA_SITES['courier-satchel']` is 29.5, and `HAIL_FROM.reach` is 34.

---

## The swimming fixes, verified on the real world — and the one thing the leash hands a swimmer

All of this was driven through `src/main.js`'s own calls on the world `createWorld` builds: the
`else if (magnitude>0)` movement branch, the float line, the region card at 3071, `swimTick` and
`retry()`, frame by frame at 60 Hz. Not read — run.

### What is now true, measured

**A walker gets wet, from a real shore, with no warp.** The closed loop the last hunter found is
gone: `{swimming:true}` on the on-foot move is what opens it.

| shore | wet after | ground under him there |
|---|---|---|
| the sea off the Tidehaven strand (24.4, 29.6) | 0.47 s, 1.8 m | −5.73 m |
| the harbour off the pier head (7.5, 25.4) | 0.22 s | 0.44 m |

He walks out again the same way, is paid (`+6` xp for 28 m), and the landing writes a checkpoint.

**Drowning puts him on the last dry ground he stood on.** Three situations, all three correct:

| | swam | went under at | Try again took | woke |
|---|---|---|---|---|
| never fought a soul | 77 m, 33.3 s | (54.4, 101.6) | the drowned branch | (23.2, 31.2) — **0.00 m** from his last dry ground |
| after a real fight | 108 m | (64.9, 129.7) | the drowned branch | 0.00 m from it |
| walked in mid-fight | 108 m | (66.9, 129.7) | the drowned branch | 0.00 m from it |

Every one: hp 100, wind 100, phase `peaceful`, no enemies alive. The old failure — a man who had
never drawn on anybody waking 346 m away in a goblin raid — cannot happen.

**Getting wet mid-fight resets nothing.** The goblin stayed on the sand 4.4 m from the fight's
centre and never entered the water; the fight ended by the 45 m leash after 15.1 s, at 38 m out,
with a `retreat` event and no `resetEncounter`.

**Nothing saves from the water.** The Save button is refused with "Step ashore and finish any
active fight before saving". And the autosave inside `enterRegion` **does** fire at sea — swimming
north-east out of Drent the traveler enters *Open country* 58 m out, on the shore fringe, with the
region card and all — and its `saveRoad(false)` is refused because he is wet. The reload-for-a-
fresh-bar crossing is closed.

**A rider cannot get in, and "He will not go in" is unreachable by riding at water.** At all four
shores the horse stops with dry ground under him (1.80, 0.49, 0.50, 0.46 m) and `canSwim` under
him false, so the toast at `src/main.js:2627` never fires. It fires only one way: mount from the
water (below). Worth knowing before anybody "fixes" the toast as dead code.

### The finding: the 45 m leash hands a swimmer a full bar of wind

`src/combat.js:715–722` ends a fight when the traveler is 45 m from its centre, and it does it
with `restorePlayer()` — full health **and full stamina**. Stamina is wind, and wind is the entire
currency of the swimming design (`docs/swimming.md`'s crossing table is tuned on it).

Same swimmer, same bearing, same sea, the only difference a fight picked on the sand first:

```
a. plain swim         0m wind 100   15m 87   30m 61   45m 35   60m 9   75m 0 → drowned 77 m out
b. with a fight on    0m wind 100   15m 87   30m 61   45m 88   60m 62  75m 36  90m 10  105m 0
                                                       ^ the leash fires    → drowned 108 m out
```

**77 m becomes 108 m: 40 % further, free, at level 1.** `swimReach` at level 1 is 58 m; this adds a
second bar wherever the leash happens to fire.

**It is not reachable today, and only by five metres.** Of the eleven fights the game can start,
measured centre to nearest swimmable point:

| | |
|---|---|
| the Bramble scout camp (55, −190) | **50 m** |
| the opening Tidehaven raid (−56, 29) | 62 m (and it is `DEFAULT_ENCOUNTER`, which the 45 m rule exempts) |
| the day after, Solis sweep | 98 m |
| Mallec at the pass stones | 102 m |
| every other fight | > 200 m |

So by the time a swimmer is wet, the leash has already fired on land. The rule that keeps the
crossing table honest is geography, not code, and it has 5 m of margin. The same five metres hold
a second one: `retry()`'s drowned branch returns before the line that tells a chapter module its
fight is over (`forestHideout.begin` at `src/main.js:2674`), so a traveler who drowned during a
quest fight would leave that module believing the fight was still running — except that he cannot
get wet during one.

*Proposed, and not mine to make:* the leash should not hand back wind the water has taken. The
smallest version is for the host to keep the swimmer's stamina across a `retreat` event while
`inWater`; the honest version is a flag on `restorePlayer`. This is the builder's ground (combat
skills are next on that branch), so it is written down here rather than changed.

### Small: mounting out of the water throws the swim away

`swimTick`'s mounted branch (`src/main.js:2626–2630`) returns before the payout block, so a
swimmer who presses G at his horse instead of taking one more step loses the whole swim: no xp,
no water crossed, no checkpoint. Reproduced: swimming 2.84 m from the horse (mount reach is 2.9),
G is accepted, `toggleMount` teleports him to the horse on dry land, and `inWater` is cleared by
the mounted branch with `swimMetres` still on the clock. The repair is one line — pay out first
when `inWater` was true — and it belongs with the code above.

### Checked and killed

- **"The Caloss can be waded, so the bridge is decoration."** No. My first scan ran *along* the
  river instead of across it and said so; measured properly across its own centre line
  (`CALOSS.points`), all 24 places have an unbroken 15.6–17.2 m block of not-standable ground
  across them. The river is solid to a walker for its whole run until it meets the sea, where the
  bed drops to −5.5 m and 70 of 111 samples become swimmable. The bridge is the only crossing.
- **"Inland water is walkable, so swimming is broken."** No: it is waded, on purpose. Willowmere
  Pond's bed is dished 0.85 m under its drawn surface (`src/world.js:195`) and the Caloss's is
  1.10 m under its, but both stay above the 0.45 m waterline, so `canSwim` is false and a traveler
  wades. Every fishing spot casts into ground above the waterline (willowmere 1.74 m, reedwater
  3.40 m, tessen-bank 2.88 m). Swimming is a sea skill, which is exactly what the Peblos table in
  `docs/swimming.md` is about.
- **"Whistling from out at sea puts the horse in the water."** No. `riding.update`'s "turns up
  behind you" path tries eight bearings at 14 m and tests `canStand` on each; from 65 m out at
  sea it found none and did nothing.
- **"`revive()` leaves `combat.state.encounterId` naming a fight that is over."** It does, but
  `#encounter-status` is hidden outside a fight and every other reader is inside an event handler,
  so nothing shows it.

---

## Distant figures: the stand-in is wired, and a shorter view range was rejected

Two ways to stop drawing a belt buckle on somebody thirty pixels tall, measured against each
other rather than argued: **(a)** bring the 180 m view range in, so distant people are not drawn at
all, or **(b)** draw them as one mesh. They are alternatives — with (b) in, a distant figure
already costs one call, so (a) would then save one call a head.

**(b) was built. (a) was rejected, on three numbers and one thing a player sees.**

| | landing | Lauvel | Lumber Town | Moros camp |
|---|---|---|---|---|
| figures drawn | 33 | 31 | 26 | 8 |
| beyond 60 m | 18 | 18 | 14 | 0 |
| **(b) saves, figure meshes** | **121** | **295** | **188** | 0 |
| (a) at 120 m would drop | 8 figures | 5 | 0 | 0 |
| (a) at 100 m would drop | 9 | 10 | 1 | 0 |

(a) saves nothing at all at Lumber Town at 120 m and nothing anywhere at the camp, and where it
does save it saves about half what (b) does. And its cost is the most visible artefact available:
a crowd at a town's edge blinking out of existence at 100 m and back in again. (b)'s cost is a
figure thirty pixels tall losing limbs that were two pixels across. The Moros plain is the place
the argument turns on, and it settles it either way: nothing is beyond 60 m there, so (a) buys
nothing on the one map whose whole point is a long sightline.

**Measured after wiring** (`npm run review:draws`, 16 samples, no errors). `figureMeshes` is the
honest column because it does not depend on which way the camera is pointed:

| spot | figure meshes before | after | stand-ins | worst facing, draw calls |
|---|---|---|---|---|
| Tidehaven landing | 782 | **661** | 8 | 1,930 → 1,849 |
| the Lauvel field | 536 | **241** | 18 | 1,071 → 859 |
| Lumber Town square | 447 | **259** | 11 | 934 → 838 |
| the Moros camp | 164 | **164** | 0 | 676 → 749 |

1,929 figure meshes become 1,325 across the four: **31 % fewer**. The camp is the control — no
figure there is beyond 62 m, so nothing converts — and it reconstructs exactly (20.5 × 8 = 164
before, 164 after), which is what says the other three rows are the stand-in and not noise.

**The camp's draw calls went up, and that is not the stand-in.** The before table was taken on
`e071ccd`; this was taken on `348ba34`, which has the builder's queue and the long road's first
five pieces in it. With zero stand-ins the camp still moved +72, +73, +154, +73 by facing. So the
other spots' savings are *understated* by roughly that much, and the two tables are not the same
base. Said here rather than quietly averaged away.

**The landing converts least, and it is right to.** Eight of its eighteen distant figures became
stand-ins; the other ten are the company — Chris walking at the traveler's shoulder is
`escorting`, several wear the mark the player is being sent to, and John at the pier is built by
his own hand. So the stand-in saves least exactly where the figures are heaviest, because the
heavy ones there are the traveler's own business. Worth an eye later; not worth weakening the
exemptions for.

**One rule added on the evidence: somebody built by their own hand is never a stand-in.**
`npc.make` — Bowden, John, the troupe, the gravedigger — wears whatever that maker chose and
nothing records it. Reading the colour back off the built rig was tried and does not work: the
parts are batched per pivot, so the commonest colour on a villager's chest is **0xd6ac7d, the skin
of the arms it carries**, not his coat. Bowden is 83 meshes and reads `0xf1ead6` on the chest.
A guessed colour is a man who changes coat at sixty-two metres, which is worse than the calls it
saves. There are four of them and they stand alone.

Everyone else matches by construction: the figure is built with `tunic: npc.color`, and where an
entry names no colour both sides now ask one exported question (`tunicForRole`, `skinForRole` in
`src/characters.js`, which were `createCharacter`'s own parameter defaults and still are), so they
cannot drift.

---

## The two shots wanted at the 56–62 m stand-in band

Whoever next opens a window for the long road's end-of-build walk: please take these two, and
nothing else is needed from the run. They are a pair that differs **only in distance**, so the
two pictures can be laid side by side.

**Subject: Maudry, the shrine keeper at the Lauvel** (`lauvel-keeper`, at −672.7, 325.4). She is
chosen because she is the cleanest subject in the game for this: she stands still, she is never
posed, escorting, marked, ridden, swimming or built by her own hand, and she wears a role colour
(`rise-custodian`, 0x60677c) against open field, so a coat that changed would be obvious.

```
--review-views=stand-at:-672.7,389.4,3.1416     # 64 m: she is a stand-in
--review-views=stand-at:-672.7,379.4,3.1416     # 54 m: she is herself
```

Both spots are standable and the ground between is clear the whole way (measured). The camera
looks due south (π), straight down the field at her.

**What the pair should show.** The same woman, the same colours, in the same place, twice: at 64 m
one mesh with her silhouette and her coat, at 54 m the full figure. What would be wrong: a
different colour between the two, a figure that has changed height or sunk into the ground, or a
mark over the 64 m one. If anybody can spare a third, the same bearing at 59 m (`stand-at:-672.7,
384.4,3.1416`) is inside the 56–62 m band and should show whichever she already was.

---

## Mus tells you the road is quicker while he is in the ruins of Rena

**Seen:** you meet a hired sword in the woods a long way from any road — in the ruins at Rena, say
— press F, and he says: *"Road today. It is quicker with company."*

That is the one thing Mus would never say. His own second line, four words earlier in the same
file, is *"I do not use the road. It goes where everybody knows it goes."* The whole of
`src/wild-route.js` exists because the user ruled that he does not use it.

**Cause.** `mercenaryLines` (`src/mercenaries.js:490`) picks a line by `placement.phase`, and a
wild man's phase is `walking` for the whole of his 1,702 m — `createMercenaryCompany` gives him no
stops, so he can never report `stopped`. His roster row (`src/mercenaries.js:130`) answers
`walking` with the road line, because when it was written the road was the only thing he could be
walking on.

**Where a player meets him.** Measured off the route against every named place in the world:

| | |
|---|---|
| The Well at Rena | **2 m** |
| The Ruins of Rena | **5 m** |
| The Row at Rena | 29 m |
| Rena's Orchard | 43 m |
| Applegarth | 43 m |

So the likeliest place in the game to meet Mus is Rena — which has the archaeology digs and Rena's
letters in it, and is somewhere a player has reason to stand about. He has a prompt there
(mercenaries are ordinary talkers, ranked `passing` by `src/prompt-priority.js`), he answers F,
and the first thing he says is the road.

*Smallest repair:* a `walking` line for a man with no road under him. It is his roster row and one
string — the builder's, not mine.

---

## Twenty-nine metres of Mus's line are ground he cannot stand on

`src/wild-route.js`'s header says every metre was authored against the built world: *"A\* over
ground `canStand` accepts, with the main road fenced off at 40 m, then simplified to the fewest
waypoints that keep both rules."* Walked a metre at a time with `canStand` and a person's radius:

| | |
|---|---|
| the whole line including the muster leg | **41 of 1,702 m blocked** |
| the eleven authored waypoints alone | **29 m**, on legs 1, 2, 4, 5 and 8 |
| the appended muster leg | 11 m |
| in water | **0 m** — he never swims, which is right |

The first is at (7.0, −60.3), barely off his own beach. The A\* was honest; the **simplification
to fewest waypoints cut the corners back through the props the A\* had gone round**. Nothing
catastrophic happens — `stepAround` shoulders him past and his home walks on without him — but the
file's own promise is not kept, and a man visibly brushing through a thicket is what it buys.

**And the 89 m claim is overstated.** The header: *"It never comes within 89 m of the main road
until it is 41 m from the camp."* Measured against `world.paths[0]`:

| | |
|---|---|
| closest approach of the eleven authored waypoints | **55.6 m**, at the last of them (−1000, 545) |
| closest outside the 41 m join, with the muster leg | **39.7 m**, at a point 41 m from the muster |

`WILD.clearance` is 40 m and the reason it exists is that *"the long road's companion remarks on
any mercenary who passes within 40 m, and Mus must never be the one she remarks on."* That holds —
but by **0.3 m at the join's own edge**, not by the 49 m of margin the header implies. Worth the
long-road builder knowing the true number before anything else is built on it.

---

## The two golds: checked, and one near-miss killed

**Both golds over one head is impossible.** `markerFor` gathers the grades somebody qualifies for
and `strongestMarker` returns exactly one, by a rank table in which `main` (4) beats `main-open`
(3) beats `plot` (2) beats `skill` (1). `mark()` then builds one object. A teacher who is also the
long road's next stop wears the open gold and not the green leaf, which is what *"the open gold
rides over whichever of them is next"* means.

**No gold sits over somebody with nothing to say.** The eleven ids the long road's stops name —
`harbormaster`, `garden-keeper`, `acorn-cook`, `pond-fisher`, `woodcutter-bowden`, `mycologist`,
`meadow-courier`, `commons-miller`, `botanist`, `geologist`, `crossing-keeper` — all resolve to
real people with conversations, and a stop that names no npc is given a marker at a *place*
instead (`openAt`, `src/main.js:3261`), never a gold over a body. `tests/long-road.test.js:28`
only asks that a stop is "somebody or somewhere", so nothing else was checking this.

**The near-miss.** `markerFor` used to answer a bare word and now answers a fresh frozen
`{ kind, open }` every call. The host's rebuild guard is `npc.markerKind !== <that>`, and against
a new object every frame that is always true — every marked NPC's marker mesh would have been
removed from the scene, rebuilt and re-added sixty times a second. It does not happen: the builder
put `markerGrade(mark)` between them, which returns one word again, and the comparison is
word-to-word (`src/main.js:3484`). Checked and cleared.

---

## Load-bearing: `revive()` leaves `encounterId` set, and the drowned branch now needs it

**Read this before tidying `combat.revive()`.**

`revive()` (`src/combat.js:791`) sets the phase to `peaceful`, empties the enemies, clears the
allies and restores the player — and deliberately or not, it **leaves `state.encounterId` naming
the fight that is over**. Reported here earlier as harmless: `#encounter-status` is hidden outside
a fight and every other reader sits inside an event handler, so nothing shows it.

It is not harmless any more. `retry()`'s drowned branch (`src/main.js:2838–2851`) now reads:

```js
if(inAftermathFight())aftermath.endEncounter(combat.state.encounterId);
combat.revive();
```

`inAftermathFight()` (`src/main.js:942`) is `aftermath.spec && combat.state.encounterId ===
aftermath.spec.encounterId`. Both the test and the argument are `combat.state.encounterId`, and
the call sits **before** `revive()` on purpose. Clear the id inside `revive()`, or move that line
below it, and a traveler who drowns inside one of the day-after fights leaves the aftermath
believing its encounter is still running — which is the thing those two lines exist to prevent,
and it will not let the commander be given the word again.

Two ways to make it safe if `revive()` is ever tidied: have `revive()` return the id it cleared,
or read the id into a local before either call. Neither is urgent; what is urgent is that nobody
removes the line without knowing why it is where it is.

*How near this is to being reachable:* not very, and by the same margin as everything else on this
shore. Of the eleven fights the game can start, the aftermath's nearest swimmable water is 98 m
(the Solis sweep) and the 45 m leash ends a fight long before a swimmer is wet — so drowning
inside an aftermath fight cannot happen today. It is a guard against the geography changing, which
is the right kind of guard to have, and `tests/swimming.test.js`'s beach-fight tripwire is what
says when it stops being theoretical.

---

## Coming ashore never writes its checkpoint

**Seen:** swim a crossing, walk out onto the far beach, and the game tells you what the swim was
worth — *"Swimming +8. 18 m of it."* No checkpoint is written. Quit there and the crossing is not
in the save.

**It is meant to write one.** `payForTheSwim` (`src/main.js:2790`) ends with
`if(paid.xp||swimMetres>12)saveRoad(false);` — the whole point of that line is the autosave after
a crossing.

**Why it never fires.** `saveRoad` refuses while `inWater` (`src/main.js:2030`), which is the
repair that closed the reload-with-a-full-bar crossing and is right. But both calls to
`payForTheSwim` sit *inside* the `if(inWater)` that is about to be cleared:

```js
if(!wet){ if(inWater)payForTheSwim(p.x,p.z);     // src/main.js:2821 — walking out
          inWater=false; … }
if(riding.mounted){ if(inWater)payForTheSwim(p.x,p.z);   // :2807 — mounting out
                    … inWater=false; return; }
```

So the save is attempted one statement before the flag that forbids it is cleared, and is refused
every time. Driven on the real world through `main.js`'s own frame, taught swimmer, 18 m out and
back:

| | xp paid | checkpoints attempted | written |
|---|---|---|---|
| walked out | **8** | `[{ok: false, wet: true}]` | **none** |
| mounted out at the horse | **8** | `[{ok: false, wet: true}]` | **none** |

The xp and the waters-crossed are paid correctly; only the save is lost. `docs/swimming.md` says
*"No checkpoint is written from the water"* — true, and it turns out none is written on leaving it
either, which is the one place the design wants one.

*Smallest repair:* clear `inWater` before the payout rather than after it, in both branches — or
let `payForTheSwim` clear it as its first act, since it is only ever called to end a swim. One
line either way.

---

## A hired sword marches on the spot at a stop, and the ceiling hides it

The builder recorded 140 of 2,523 walking/stopped placements (5.5 %) putting a man's *home* inside
a prop, with a test ceiling of 8 %, and left it deliberately. Split by phase on the real world it
is a different shape:

| phase | blocked homes | rate |
|---|---|---|
| walking | 16 of 816 | 2.0 % |
| **stopped** | **32 of 197** | **16.2 %** |

**That split is the whole finding.** A walking man's home moves on down the road, so a prop only
ever brushes him aside for a moment. A *stopped* man's home is fixed for his entire dwell — 60,
90 or 120 s at the three stops — and one in six of those is somewhere he cannot stand.

Driven through `main.js`'s own step (`stepAround`, 2.4 m/s), starting each man from ground
`canStand` accepts within 12 m of his home: of the blocked *stopped* placements sampled, **12 march
and 20 stand still.** Marching means he never gets inside the 0.1 m of his home that
`main.js:3474` needs to stop, so `pace` stays above 0.1, so the walk cycle keeps playing and he
keeps turning to face the home he cannot reach. A hired sword doing a walk cycle on the spot
against a hedge, for up to two minutes, in Lumber Town square and at the crossing.

So it is not only a number. The 8 % ceiling is over both phases together, and 5.5 % passes it
while the phase that shows passes 16 %. *Smallest repair:* nudge a blocked **stop** position to
the nearest standable point when the formation is laid, which is 197 placements rather than 2,523;
or give the ceiling a per-phase half so the test says which phase it is talking about.

---

## Chris is set down beside you four times on a run down the road

`src/main.js:372` explains the 40 m set-down as *"at forty there is a wall, a river or a boat
between you."* A sustained run is a third way to reach it: the companion's top pace is 6.4 m/s
(`main.js:401`) and the traveler's run is 7.2, so the gap opens at 0.8 m/s and forty metres is
fifty seconds.

Measured, following the real road polyline at a run from the landing: **1,668 m, gap reaching
exactly 40.0 m, set down beside the traveler 4 times.** What a player sees is a man appearing at
their shoulder out of nothing, four times, on the way to the muster. Not a fault in the rule —
the rule is right for walls and rivers — but the running case was not in its reckoning.
(Routed to the long road.)

---

## Mara and the cardinals: killed, and the rule underneath it is not what it says

**The report was that Mara stands inside the cardinals' home ground (`west-fences`, radius 5.5)
and takes their perches. She does not, by a wide margin.**

| | |
|---|---|
| Mara's stand (`world.pierHead`, set `src/main.js:272`) | world (0, 25) |
| `west-fences` as authored | village (−23.5, 2.5), radius 5.5 |
| the same in world metres (`villageToWorld`, it carries no `world: true`) | (−17.5, 52.5) |
| between them | **32.60 m** |
| nearest of its eleven perches to her | **28.7 m** |

It is not even a frame mix-up: comparing her world position against the raw authored centre gives
32.53 m, so both readings agree she is far outside. The nearest bird ground she comes to at all is
`green-robins` at 10.2 m against a 6 m radius — 4.2 m clear.

**And a stand cannot take a perch from anybody.** `habitatSpots` (`src/drent-birds.js:500`)
applies `avoid` — which `main.js:947` fills with every NPC's position — only to the **ground**
foraging spots, at 1.6 m. `habitat.perches` are mapped through unconditionally. So the worry
written at `src/rena.js:192-194`, *"nothing sits inside a bird's home ground … which would take its
perches away"*, describes something the code cannot do. What a stand can take is ground spots.

**Nothing takes any.** Built the world and ran `habitatSpots` for every habitat twice, once with
`avoid` empty and once with every stand in the game: **not one habitat loses a single ground
spot.** `west-fences` keeps 22 ground spots and 11 perches either way.

Two things did come out of the sweep, and neither is the harbourmaster: the long road's
`bird-garden` stop point sits 2.63 m inside `bramble-catbird` (radius 4) and `willowmere-fire`
4.80 m inside `willowmere-reeds` (radius 6). Those are places the player is sent to stand, not
stands, and they cost the birds nothing by the measurement above — noted only so the next person
measuring this starts from the right two.

---

## Three of the seven Arms skills can never be capped, because they take no source

`ARMS.ceiling` (`src/combat-skills.js:60`) is the rule that nobody reaches 60 by hitting straw:
`post: 5`, `sparring: 20`, and no ceiling at all in a real fight. `pay(id, amount, source)`
honours it, and `dealt()` takes a `source` and passes it through. **The other three payers do
not.**

```js
const dodged = ({ countryLevel = 0 } = {}) => pay('toughness', …);          // no source
const hurt   = ({ damage = 0, … } = {}) => pay('toughness', …);             // no source
const caught = ({ damage = 0, … } = {}) => pay('shield', …);                // no source
```

`pay`'s default is `source = 'fight'`, and `ceilingFor('fight')` is `null`. So Toughness and
Shield have no ceiling by any route. Driven: `dealt` with `source:'post'` stops Blades **exactly
at level 5** and returns `capped: true`, while the same blow in a real fight still pays at 5 —
that half is right. `dodged` called over and over with no source takes **Toughness past level 30**,
which is ten past even the sparring ceiling.

**It is latent, and now is the cheap moment.** Nothing calls `dealt`, `dodged`, `hurt` or `caught`
anywhere: `src/main.js:538` creates the module and then reads only `margins()` (`:474`, `:516`),
so no Arms skill can be gained at all today and every one of them stays level 1. Phase 1 is the
table, the margins and the save. The asymmetry costs nothing until phase 2 wires the callers, and
then it costs a player grinding Toughness on a straw post that cannot hit back.

*Smallest repair:* give the three the same `source` parameter `dealt` has, and pass it.

**Checked and right, in the same sweep:**

- **Level 1 is today's numbers**, exactly: `marginsFor` at all-ones gives `maxHp 100`,
  `maxStamina 100`, `dodgeWindow 0.37`, damage multiplier `1`, against `combat.js`'s own
  `maxHp 100 / maxStamina 100` at boot.
- **Nothing pays a skill nobody has shown you.** `pay` returns 0 xp unless `known(id)`, and all
  four entry points go through it: dealing 40 damage with an untaught sword, an untaught dodge and
  an untaught caught blow all pay nothing.

---

## Farming's clock: it survives everything asked of it

Driven on the pure module.

- **A save and a reload.** Sown at play-second 1000, snapshotted, restored into a fresh module:
  at 1000, 1239, 1240, 1241 and 5000 the row reads the same stage and the same seconds remaining
  on both sides. The snapshot is `{version, met, reaped, rows:{id:{crop, sownAt}}, trees}` —
  absolute play-seconds, and `main.js:2265` restores `playSeconds` from the same save.
- **A long absence with no sleeping.** The row is ripe at its moment and stays ripe: checked out
  to play-second 1,000,000,000.
- **Playing as somebody else.** Nothing in the snapshot is keyed to a player; restored into a
  game started as anybody, the row ripens on time.
- **The checkpoint layer cannot reject it.** `validateFarmingSnapshot` refuses a snapshot whose
  `sownAt` is later than the clock, which is right — and `src/road-checkpoint.js:148` passes the
  **saved** `playSeconds`, not the live one, so a fresh session loading an old save can never
  fail that check.

One thing to note for whoever reads a probe of this next: `sow` refuses a crop above your level
with a reason (`"Drent leaf wants farming level 5."`), and refuses an occupied row the same way.
A first pass of mine read the bare row that came back as a clock failure; it was the level gate
doing its job.

---

## Mara's three corners cannot be got without walking them

- Each corner sits in **its own chart hex**: standing on the pier makes only the pier walked, and
  so for the Weatherhead and the Koopwood. Swept every point of a 140 × 200 m box over the
  village at 2 m: **no single spot ever counts for more than one corner.**
- `reveal` (`src/map-fog.js:139-151`) adds **only the hex under the point** — no ring, no radius.
  Walking all three gives the chart exactly three cells.
- **Asking the way does not reveal fog.** `wayfindingChoice` (`src/main.js:2833`) calls
  `cartography.hear(name)`, which feeds the cartography skill's knowledge of a *region name*.
  `mapFog` is untouched by it.
- The only other `mapFog.reveal` calls in the game are the traveler's own feet each frame
  (`main.js:3527`), the spot "Start at the newest chapter" drops him on (`:1833`, one hex, and
  nowhere near Tidehaven), and `chartRoad`, a `?test=1` harness hook (`:4003`).
- A **warp** would count — the next frame reveals wherever he lands — but the testing panel's
  travel buttons go to the village, the pond and the bird garden, none of which is the Weatherhead
  or the Koopwood. The **developer horse** is only faster; the ground still passes under it.

---

## Mus, walked again: the authored line is clean, and 13 m of the appended leg is not

The repairs hold, measured the same way as before:

| | before | after |
|---|---|---|
| blocked metres on the authored legs | 29 | **0 of 1,610 m** |
| closest the authored line comes to the road | 55.6 m | **62.7 m** (the claim, exactly) |
| closest outside the 41 m join, whole line | 39.7 m | **40.2 m** — `WILD.clearance` 40 m now holds |
| in water, anywhere | 0 | 0 |

And he has stopped recommending the road. First meeting: *"You left the road. Most people never
do."* then *"I will be at the muster. Do not wait for me there, and do not look for me here."*;
after that, the short one alone. Other mercenaries are untouched — Chris and Ed still say their
road lines. His roster `says.walking` still reads "Road today", now reached by nobody wild, which
is what the comment beside it says.

**What remains: 13 m.** They are all on the **muster leg** — the straight line
`createMercenaryCompany` appends from his last authored waypoint to `ANCHORS.legionCamp`, which
`src/wild-route.js` does not author and so did not fix. It runs (−996.5, 554.9) to (−991.1,
569.9), a few metres of something solid on the approach to the camp. Small, and it is at the end
where he is arriving anyway, but the file's promise covers the whole line a man walks.

---

## Jerry calls her Christin at the muster (fixed)

One line in `src/moros-chapter.js` — what Jerry says when he walks into the camp behind you —
still used her old spelling: *"Here before us. Christin owes me nothing and is somehow still
pleased."* She is **Kristen** on screen everywhere else; `christin` and `merc-christin` are ids,
and ids never change once a save has written them.

Fixed, and `tests/mercenaries.test.js` now sweeps every file in `src/` for the capitalised old
spelling on a word boundary, so the id may keep it and the writing may not. Checked against the
old source: the test fails there and names the file and line.

Nothing was looking, because every test that knew her knew her by id.

---

## A man says he saw you at a stop you were never at

`notice()` (`src/long-road.js:374`) records, for each of the ten, **the stop the traveler was
nearest to** when they passed within 40 m or shared a named ground. `nearestStop` (`:259`) has no
radius: it returns the nearest of all sixteen spine stops however far away it is.

The lines those ids feed are written as sightings of an **activity**, not a place —
`'bran-rod': 'up to your knees in a pond'`, `'nell-hedge': 'in a hedge. In it. Not beside it'`,
`'odger-fernway': 'at the bench at Fernway, holding a mushroom up to the light'`. So the muster
makes a man assert something that did not happen.

**Driven:** traveler at (−250, 60), Jerry five metres off, standing on no named ground. Recorded:
`odger-fernway` — whose bench is **123 m away**. At the muster Jerry says *"We passed you. You
were at the bench at Fernway, holding a mushroom up to the light."* The traveler had never been
to the bench.

**How wide it can get:** the spine's widest gap is `fernway-play → corvan-register` at **305 m**,
so a traveler halfway along is **153 m** from the nearest stop and will be placed there.

The fallback already exists and is good: `PLACE_UNKNOWN` is *"somewhere back down that road"*, and
with nobody seen anywhere, 9 of the 10 lines already use it. *Smallest repair:* give `nearestStop`
a radius — `NOTICE_RANGE` (40 m) is the obvious one, since that is already how near a man has to
be to notice you at all — and return null beyond it, so the honest clause is used.

---

## The two repairs, verified on the real world

**The landing checkpoint is written.** A 22 m crossing, `swimming.learn()` first so the xp is real:

| way out | xp | checkpoint |
|---|---|---|
| walked out | 11 | **written**, at (28.0, 30.0), dry ground |
| mounted out at the horse | 11 | **written**, at (28.0, 30.0), dry ground |

Both were refused before. `payForTheSwim` clearing `inWater` as its first act is the whole fix.

**Blocked stop places: 32 → 0.** With `standable` passed as `main.js` passes it, **stopped is 0 of
197**. (My first re-run said 32 of 197 because my harness had not passed the new callback — the
nudge lives inside `createMercenaryCompany` and only runs when the host hands it a footing test.)

**What remains, measured properly.** 14 of 816 *walking* homes are still blocked, and walking homes
are deliberately not nudged. My earlier fixed-home sweep called nine of them "marching", but that
sweep held a walking man's home still, which play never does. Driven instead with each man's home
taken from `placements(t)` every frame over forty minutes of play, and counting only frames where
he is walking, his home is blocked **and the gap is not closing**:

| | |
|---|---|
| blocked-home frames, all ten men | 4,141 of 1,440,000 (**0.288 %**) |
| longest any man is genuinely stuck | **3.88 s** (Kristen, 1.39 m from her home) |
| next longest | 1.73 s (Ciarán), 0.95 s (Jerry), 0.88 s (Lakota) |

Four seconds of a man not quite closing the last metre and a half, once in forty minutes, is not
the two minutes of marching the stopped case was. The repair took the part that showed.

---

## Combat phase 2 against the main arc: a linear player against a multiplicative country

Measured on the pure modules. Nothing retuned.

### Which country each of the arc's fights now takes

| fight | country | L | enemies |
|---|---|---|---|
| the opening raids, the Avrel clearing | Drent | **0** | goblins 65–75 |
| the Bramble scout camp | Pueth | **1** | 2 goblins 65 |
| the wolves on the burial line | Luscia | **1** | 2 wolves 58 |
| Mallec at the pass stones | Amod | **2** | ogre 620 |
| the border battle | Moros Plain | **2** | 8 soldiers 100 |
| the day after (all four variants) | Moros / West Suval | **2** | 7 soldiers 100 |

### What that does, blow by blow

| fight | L | enemy health | swings to kill | blows you can take |
|---|---|---|---|---|
| Drent's raids | 0 | 75 → 75 | 3 → **3** | 6 → **6** |
| the Bramble camp | 1 | 65 → 94 | 3 → **4** | 6 → **5** |
| the Lauvel wolves | 1 | 58 → 84 | 3 → **3** | 8 → **6** |
| Mallec | 2 | 620 → **1,178** | 23 → **43** | 4 → **3** |
| the border battle | 2 | 100 → **190** | 4 → **7** | 5 → **3** |
| the day after | 2 | 100 → **190** | 4 → **7** | 5 → **3** |

### Why the traveler cannot answer it

The Arms table is a **straight line from level 1 to 99** (`along`, `src/combat-skills.js:82`). One
level is **+2.04 % damage** and **+3.0 health**. The country is **+45 % enemy health** and
**+30 % enemy damage per level**. So:

| country L | enemy health × | Blades to match | enemy damage × | Toughness to match | docs' "9 × L" |
|---|---|---|---|---|---|
| 1 | 1.45 | **24** | 1.30 | **11** | 9 |
| 2 | 1.90 | **46** | 1.60 | **21** | 18 |
| 3 | 2.35 | **68** | 1.90 | **31** | 27 |

Walking the arc and paying exactly what its fights pay, the traveler arrives with **Blades 8 /
Toughness 6** at the Lauvel (L1 wants 24 / 11) and **Blades 17 / Toughness 12** at the border
(L2 wants 46 / 21). Toughness roughly half-answers its country; **Blades never does**, because
health is the thing that scales and damage is the thing that does not.

The xp rate is not the lever: reaching Blades 24 takes **64 level-1 goblins**, and Blades 46 takes
**370 level-2 soldiers**. The arc does not contain them. *The curve is the lever, not the rate.*

### Where the first wall is

**Not at Luscia.** The Lauvel wolves stay a three-swing kill (58 → 84 against a 84-point combo)
and cost 6 blows of tolerance instead of 8. The Bramble camp goes 3 → 4 swings. Both are harder
and neither is a wall.

**The wall is level 2, and it is specifically the soldiers.** A soldier at 190 hp needs 7 swings
where he needed 4, while the traveler's tolerance falls from 5 blows to 3 — and a soldier is the
one kind that cannot be handled the way goblins and wolves can (below). The border battle is
**eight** of them, with `guard`, `armor`, `poise` and `pack: 2`. Every one of the four day-after
variants is seven more.

**Mallec is the loudest number and the least urgent:** 620 → 1,178 hp, 23 → 43 swings. He is a
toll before he is a fight, and the toll is still payable.

### The thing that makes Drent and Luscia safe, and the border not

Driving `combat.js` with the autopilot's own `fightCommand` at its own `swingEvery` of 0.3 s, the
traveler finishes the Drent raids, the Bramble camp and the Lauvel wolves at **40 of 40 seeds with
100 % health**, at every level — and loses the border battle **0 of 40** (and 3 of 40 even at
level 0, before any of this).

That gap is not the country's doing. It is `src/combat.js:403-412`: a landed blow staggers an
enemy, resets its recovery and pushes `nextAttackerAt` by 0.35 s — **unless the kind has `poise`**.
Goblins and wolves have none, so a swing every 0.3 s holds them permanently staggered and they
never wind up. Soldiers have poise, so they cannot be held, and they answer.

So the country's multipliers are nearly invisible wherever the player can stun-lock, and
unforgiving wherever he cannot. **Take the harness's 100 % health as the ceiling, not the
expectation** — it approaches in single file with perfect facing and never misses. The shape is
what matters: the arc's difficulty is decided by `poise`, and the country's levels then multiply
whatever that has already decided.

### The straw post and the earning rate

- The post pays a flat 12 a swing and stops at Blades 5: **33 swings**, which is a reasonable
  minute at the practice post and then honestly nothing.
- "Skills near 9 × L" (`docs/combat-brief.md`) **is** roughly what the arc pays — 8 at L1, 17 at
  L2. It is the target itself that does not keep up with 1.45 and 1.90.

### The smallest levers, and what each would do

1. **Lower `COUNTRY.health` from 0.45** (leave damage at 0.30). Health is what outruns a linear
   player: at 0.20 a soldier is 140 hp (5 swings, not 7) and Mallec is 868 (32 swings, not 43).
   One number in the frozen table; nothing else moves. **The smallest lever that removes the wall.**
2. **Author a level on the story fights** (`level:` is already honoured per encounter, and
   `encounterConfig` reads it). Keeps the ladder for the open world and holds the arc at 0–1.
   More edits, but it is per-fight surgery rather than a global change.
3. **Steepen `ARMS.damage`** from `{low: 1, high: 3}`. Makes the player catch up, but it changes
   every fight at every level, including the ones that are right today.
4. **Raise the xp rate.** Measured above: it does not reach. 64 goblins and 370 soldiers are not
   in the arc at any rate this side of a tenfold change.
5. **Wait for armour (phase 3).** Answers the damage half (3 blows back toward 5) and does nothing
   about the health half, which is the 7-swing soldier and the 43-swing ogre.

The numbers are the user's; this is the measurement, not a proposal.

### Would the Electron smoke still pass?

**Yes, on this evidence, and it is worth saying before paying for the run.** The road smoke's two
fights are the **Avrel clearing raiders** (Drent, level **0** — unchanged to the digit) and the
**Lauvel wolves** (Luscia, level 1 — still a three-swing kill, with 6 blows of tolerance instead
of 8, and the smoke's own loop dodges on the amber tell before it swings). Neither is a soldier
fight; the smoke never reaches the border battle or the day after. The one thing that could still
bite is the smoke's fixed `deadline` per fight, since a wolf now takes the same three swings but
the traveler is closing on a stouter enemy — the wolves resolved comfortably inside the limit here.

---

## The border battle with its side, and a correction to my own reading of it

**First, the caution answered: the harness did have the allies.** `borderEncounter('empire',
allies)` attaches four, `startEncounter` builds them into `state.allies` at 90 hp each, active,
and `combat.update` steps them every frame. The earlier rows were fought beside them.

**But I framed the result badly, and the framing was the wrong half.** What I reported as "3 of 40
even at level 0, before any of this" was fought with **no Arms skills at all** — which is the game
*before* phase 2, not the game the hold restores. Fought at level 0 with the skills the arc
actually pays by then (Blades 17, Toughness 12), it is a different battle:

| | won | health left | allies up (of 4) | enemies down (of 8) |
|---|---|---|---|---|
| **level 0, with the Arms the arc pays** — what the hold restores | **29/40** | 42 % | 3.5 | 7.1 |
| level 0, with no Arms at all — the old game | 4/40 | 16 % | 3.5 | 4.2 |
| **level 2, with the same Arms** — what lifting the hold means | **0/40** | — | 3.3 | **1.4** |
| level 2, a careless player | 0/40 | — | 3.3 | 1.4 |

So **phase 2's fighting skills make the border battle much better than it was** — 4 of 40 becomes
29 of 40, and it lands where a climax should: won most times, at 42 % health, having lost half a
man. The hold does not restore the old game; it restores something better than the old game.

**And at level 2 it is not a hard fight, it is a wall.** Not 0 of 40 by a margin — **1.4 of 8
enemies down** before the traveler falls. Nothing about play closes that: the careless row is
identical, because the fight is decided by whether 190 hp can be got through at all, not by
dodging.

**The number to lift the hold against:** gear and company have to carry the traveler from 1.4
enemies down to 8. At level 2 a soldier is 190 hp and a three-hit combo at Blades 17 does about
111, so it is a little over two full combos a man, eight times, inside a fight he currently
survives about a fifth of.

### One asymmetry for phase 3 to know about

**An ally's health is not scaled by the country; the blow that kills him is.** `countryHealth` is
applied in the *enemies* loop of `encounterConfig` (`src/combat.js:124`) and nowhere else, so at
level 2 the man you are fighting has 190 and the man beside you still has 90 — while `hurtAlly`
(`src/combat.js:647`) scales what hits him by `countryDamage`, ×1.60.

It does not show in the rows above (3.3 allies still standing at level 2 against 3.5 at level 0),
and the reason it does not is worth saying plainly: **the allies are not surviving because they
are fine, they are surviving because the traveler dies first and ends the fight.** In a level-2
battle the traveler could actually win — which is what gear and company are for — the side would
be taking ×1.60 blows on unscaled health for a great deal longer, and that is where it would show.
Whoever tunes phase 3 should decide whether a country's level is a property of its enemies or of
its ground; today it is of its enemies only, and your own side is standing on the same ground.

---

## The recognised teachers never say their line: thirteen lines wired to nothing

`src/long-road.js` exports three things for the traveler who already has a skill a stop teaches:
`knowsAlready` (`:587`), `RECOGNISED` (`:595`, thirteen lines, one per spine teacher) and
`recognisedAt` (`:611`). The design is in `docs/drent-long-road.md` §10: *"the teacher takes one
recognising branch — 'you have done this before' — the first-find step is waived, the stop counts,
and the talk still pays its Drentish."*

**Nothing in `src/` reads any of the three.** Grepped the whole tree: the only importer is
`tests/long-road.test.js`. `src/main.js` never asks whether a teacher should recognise anybody,
and no conversation anywhere reaches those lines. So thirteen written lines — Bowden's
*"YOU HAVE SWUNG ONE! Good! Then swing it at MY trees"*, Nell's *"You name things. I can hear
it"* — cannot be reached by any player.

**It matters because every one of the eleven lands knowing something.** Each closes one or two
stops the moment they step ashore:

| player | lands knowing | closes at t = 0 |
|---|---|---|
| Jerry | fishing | `bran-rod` |
| Kristen | cooking | `lysa-acorns`, `willowmere-fire` |
| Ciarán | geology | `silas-stream` |
| Lakota | birding, archaeology, wine | `bird-garden`, `rena-dig` |
| Eliana | woodcutting | `bowden-axe` |
| Matt | construction | `house-plot` |
| Altun | mycology | `odger-fernway` |
| Mus | cartography | `pier-chart`, `village-corners` |
| Cromb, Chris, Ed | — / linguist / swimming | nothing |

And the stop is *closed*, not shortened: `done(state)` is re-derived from the skill being known
(`src/long-road.js:270` — "nothing here is remembered"), so the stop is ticked before the teacher
is met. Being closed, it is never `longWayNext()`, so the teacher never wears the open gold, so
the player is never pointed at them at all. Play as Lakota and Perrin is an ordinary villager with
no mark and nothing to say about birds — `markerFor` also drops his green leaf, because
`view.birdingLearned` is already true. The acknowledgement the design asked for is written, tested
for its prose, and unreachable.

*Smallest repair:* the host asks `recognisedAt(stopId)` where a spine teacher's conversation is
built, and says that line instead of the first-find one when `knowsAlready(skills, stop.skill)`.
It is the long road's to wire; the content is all there.

### And one hole in the table itself

`RECOGNISED` covers thirteen stops: the twelve **spine** stops that teach a skill, and one more.
It has no line for **`house-plot`**, which is a **branch** stop — and `house-plot` is exactly the
stop **Matt** closes by landing with construction.

`tests/long-road.test.js:422` is the guard for this (*"somebody lands already knowing `skill` and
`stop.id` has nothing to say"*) and it does not catch it, because it sweeps spine stops only. One
man of the eleven falls through the one hole the test does not look at.

---

## Checked and clean, on the same walk

- **Nothing on the long road pays twice.** The walk is re-derived every time it is asked for rather
  than remembered, so closing a closed stop closes nothing; and releasing the companion twice is a
  no-op — the second call leaves `revision` and the stored release exactly as the first left them.
- **The muster's two faces are right.** One or two standing gives the early face with the pegs
  scene and the Marshal's work for early men; eleven gives the full turn and all ten company
  lines; three to ten gives the plain count and no company lines, which is the quiet middle the
  design asks for.

---

## The recognising, verified as it was found

Driven as each of the eleven, with the world shaped the way `longRoadWorld()` (`src/main.js:576`)
shapes it — `startingSkills` is what `landedWith` reads, not the skills module.

| player | owed | teacher | before | after | said twice? |
|---|---|---|---|---|---|
| Jerry | `bran-rod` | pond-fisher | **open** | closed | "They have already said it." |
| Kristen | `lysa-acorns` | acorn-cook | **open** | closed | refused |
| Ciarán | `silas-stream` | geologist | **open** | closed | refused |
| Lakota | `bird-garden` | garden-keeper | **open** | closed | refused |
| Eliana | `bowden-axe` | woodcutter-bowden | **open** | closed | refused |
| **Matt** | **`house-plot`** | woodcutter-bowden | **open** | closed | refused |
| Altun | `odger-fernway` | mycologist | **open** | closed | refused |
| Mus | `pier-chart` | harbormaster | **open** | closed | refused |
| Mus | `village-corners` | harbormaster | **open** | *still open* | refused |
| Cromb, Chris, Ed | — | | | | |

Every one closes once and cannot be said twice. **Matt's `house-plot` now has Bowden's line**, so
the branch stop that fell through the old spine-only guard is covered.

**Mus's second row is right, not a miss.** `village-corners` is done by `own.corners === 'signed'`,
not by a skill, so recognising lifts the block and leaves the work: Mara says *"You have surveyed.
Good — then walk my three corners"*, and he still has to walk them. The lesson is shortened and
the work is not skipped, which is what §10 asked for. Mara says both her lines in one conversation
(`src/main.js:589` filters `owed` by npc and maps them all), and the toast reads "can see you have
done **both** of these before".

**It pays nothing.** Birding xp 10,000,000 before and after, level 96 both sides; the only thing
raised is a `long-road-recognised` event. The host's handler pays nothing either and calls
`saveRoad`.

**It survives a save and a reload mid-road.** The snapshot carries `recognised: ["bird-garden"]`,
restores, and the stop stays closed with nothing still owed. **And a save from before the feature**
— no `recognised` key at all — restores cleanly and then owes the recognising afresh, which is the
right answer for a save written yesterday.

**Mara is held until the letter** by `questStage<2` in the host (`src/main.js:588`), so a man who
lands with cartography does not have the letter scene skipped.

**The two deliberate leftovers are exactly the two flagged**, and no others: `willowmere-fire`
(Kristen) and `rena-dig` (Lakota) are places with no npc, so there is nobody to do the
recognising and they stay ticked at t = 0.

---

## The six foods and Chris's five sittings: both clean, and two harness slips of my own

### The six foods

Nothing to report: `tests/larder-sources.test.js` already answers this, and answers it better than
I first did. It sweeps every file in `src/` as text and accepts five ways a food can reach the
satchel — the pedlar's stock, a recipe's output, a gathered plant, the farm, and **"somebody's
hand"**, which is any module outside `inventory.js`, `consumables.js` and `foods.js` that names
the id. It asserts that the only foods with nowhere to come from are **exactly eight**, all wines
of countries recorded on the atlas and not built, and it names them so the list cannot quietly
grow. 33 green across it and `foods`, `consumables`, `cooking`, `botany`.

**My own first probe reported pawpaw, honeycomb and wood-sorrel as unreachable.** They are not:
my version knew only four mechanisms and had no notion of "somebody's hand", so it re-invented a
narrower test and then believed it. The repo's test is the right one; mine was noise.

The six the long road gave sources to are all sourced: `avrel-apple` from Applegarth's kept
orchard, `hazelnuts` and `bramble-berries` from the hedge at the Sunken Lane, and the rest through
the skills that own them.

### Chris's five sittings

Five drills, one closing each leg but the harbour's (`DRILL_COUNT`, `src/long-road.js:37`), six
lines apiece, `DRILL_EXPOSURE = 35` — **175 taught**, which is what `docs/languages.md:286` says
and what makes the army's signs readable about as the traveler leaves Drent.

The gating is right and is the interesting part: `act('drill')` is refused with *"Not here, and
not without him."* unless the leg is finished **and** Chris is actually walking with you. The
comment at `:262` says why — *"the failure that matters is a drill given to a man on his own"* —
and a companion who has been released cannot teach.

The save holds: a snapshot claiming **99** sittings is refused by the validator (`:237`, which
bounds `drills` to `DRILL_COUNT` and to integers), and an honest one restores its count.

**Second harness slip:** my probe read `exposure` off each drill row and reported "total taught:
0". The exposure is one constant for all five, not a field on the row. Nothing was wrong but my
reading of it.

*Both slips are the same shape as the `landedWith` one and the `standable` one before it: a probe
that models the game from the outside and then trusts its own model. The rule that keeps catching
it is to find the thing from where the source builds it — and, where the repo already has a test,
to read that test before writing a worse one.*

---

## The frame's one catch now leaves a record, and one thing about it was not what we thought

### The correction first

The frame was **not** swallowing in silence, and the catch does **not** let a bad frame pass.
Read as it stands (`src/main.js`, the end of `render`):

```js
      renderer.render(scene,camera);requestAnimationFrame(render);
    }catch(error){frameErrors.note(error,frameCount);fail(error);}
```

`requestAnimationFrame(render)` is **the last statement inside the try**. A throw anywhere above
it never reaches the reschedule, so the loop *stops*, and `fail` writes the error to the console
and puts the fatal panel up. One bad frame ends the game, with a visible panel and a console line
— and `main.cjs:111` already turns a console error into a non-zero exit.

So the day the game threw, it was not quiet and it was not limping: it **froze on the first frame
of play, loudly, to anybody watching a window**. What was missing was anybody watching. Nothing
ran the host's frame for a day, so the loudness had no audience.

That matters for what to build next, so it is written down rather than folded away:

- "the catch exists so one bad frame does not end the game" is **not** what the code does. If
  that is the behaviour wanted, the reschedule has to move into the catch — a real design change
  (a game that limps on with a half-updated HUD rather than stopping), and **the user's call, not
  mine**, so I have not made it.
- while the loop stops, `frameErrors.count` can only ever reach 1. The counter is built to count
  properly and will if the reschedule ever moves; today it is a flag with a stack line on it.

### What was built

`src/frame-errors.js`, pure, and three places that now look:

1. **`state().frameErrors`** — `{ count, first: { message, at, frame } }`, plain JSON on its way
   out of the page.
2. **`src/road-smoke.js`** asks at **every `arrive()`** — thirty-odd points down the road — and
   names the message, the stack line and the frame number when it fires.
3. **`main.cjs`** asks before it photographs: the named-views loop checks before every
   `capturePage`, and the draw review checks before it files anything. A picture of a broken
   frame used to be written and kept; the fatal panel was only ever checked at load.

Plus a console line **once per distinct message** (not once per frame) and a toast while
`?test=1` or the testing tools are open.

**Proved end to end** by executing the real shape — the two farming lines from `e33762e` with
`const p` below them — and reading what came out: `count: 1`, message *"Cannot access 'p' before
initialization"*, the stack line, and frame 412; the console shouted once, the toast once, and
the walkthrough's assertion reads *"the frame threw 1 time(s) after arriving at 1.0, 2.0: Cannot
access 'p' before initialization at …"*.

---

## The better guard, for whoever picks it up: run the frame headlessly

Not built — a day of work plus upkeep, against a 30-second Electron render after each merge into
the host, which is now a habit. But it is the only thing that catches **the class**, so here are
the numbers to start from rather than an adjective.

**Why the static checker is not the answer, measured rather than assumed.** The bug's read is
inside an arrow function that `.find()` happens to call immediately:

```js
.find(row => Math.hypot(row.x - p.x, …))     // `const p` nine lines below
```

A sound scope analyser sees a closure reading a binding declared later and correctly says nothing;
knowing that `.find` calls it *now* is escape analysis, which a parser does not give you. A
hand-rolled scanner built for this reported **0 for the real bug and 114 false positives** across
`src/` after four rounds of fixes, and was taken out again. The aggressive variant — ESLint's
`no-use-before-define` shape, which reports through closures — does catch it and fires
**450 times in 90 files** here. Neither can be a gate. **No parser dependency is worth adding for
a check that would not have caught this.**

**What a headless run of `src/main.js` needs**, measured:

| surface | size |
|---|---|
| distinct element ids `$('…')` reaches for | **181** |
| `document.*` members | **10** — `getElementById`, `querySelector`, `querySelectorAll`, `createElement`, `createTextNode`, `body`, `activeElement`, `addEventListener`, `dispatchEvent`, `hidden` |
| globals | **8** — `requestAnimationFrame`, `performance`, `localStorage`, `innerWidth`, `innerHeight`, `devicePixelRatio`, `KeyboardEvent`, `location` |
| `THREE.*` classes constructed in `main.js` | **14**, plus `WebGLRenderer` |

The 181 ids are the cheap part: one generic fake element answering `classList`, `textContent`,
`style`, `onclick`, `getClientRects`, `replaceChildren`, `focus`, `append`, `dataset`, behind a
`Map` keyed by id. **`WebGLRenderer` is the cost** — it wants a GL context, so either a stub deep
enough for `world.js` and `characters.js` or a headless GL.

Once it runs, the driving is largely there already: `?test=1` hangs `window.__AZHORA__` off the
page, and the existing hooks reach `playing`. Step `render` a few dozen frames in each of
playing, fighting, dialogue, mounted and swimming, and assert `state().frameErrors.count` is zero
— the field this entry's other half just added.

---

## The file of ten collapses onto one man in two places

The file itself is good. `fileSpot` (`src/main.js:414`) takes the man's place in the file and
steps him back by `stride` with the side alternating, and measured on the built world it gives
**ten distinct standable places, no two closer than two bodies**, with the last man 38.5 m behind
the traveler — on the open road west of Tidehaven and down the pier alike.

Two paths throw that away and give every man the same point.

### 1. The hold: a fight, Pueth, or Peblos

```js
if(here==='Pueth'||here==='Peblos'||fight){
  if(!companionHold)companionHold={x:pos.x,z:pos.z};          // src/main.js:434
  …
  world.npcPositions[npc.id]={...companionHold};
```

`companionHold` is **one closure variable**, and `placeCompanion` runs once per companion in the
same frame. The first man through sets it from *his own* position; the other nine are then handed
a copy of it. So for the whole of any fight, and everywhere in Pueth and Peblos, **all ten are
told to stand on one spot**.

They are solid to one another (`src/bodies.js`), so nothing merges — they shove at that point and
keep shoving, because the home is recomputed to the same place every frame. Ten men treading on
each other for the length of a fight, just outside the box.

The keep-out itself is right: the tutorial raid's box reaches **24.2 m** from its centre and
`COMPANION_KEEP_OUT` is **26**, so the hold is outside every fight box however it is laid.

### 2. The fallback: wherever `fileSpot` finds nothing

```js
if(!canStand(x,z,world)){const spot=escortSpotFor({x:p.x,z:p.z,yaw},…);if(spot){x=spot.x;z=spot.z;}}
```

`escortSpotFor` (`src/mercenaries.js:509`) walks a fixed list of offsets and returns **the first
standable one**. It takes no place in the file, so every man who falls back to it gets the *same*
answer. Measured in **Lumber Town square, 2 of 10** find no `fileSpot` and fall through to it —
and both land on the same stone.

### Smallest repair

Both want the one thing they lack, which is the man's place in the file:

- give `outsideTheFight` the index and fan the held men along the line it already computes, or
  simply hold each man where *he* stands rather than where the first of them stood — the hold's
  own purpose is only "not in the box", and each man is already outside it;
- let `escortSpotFor` take a place and start its walk that far down `ESCORT_OFFSETS`, which is
  the same shape `fileSpot` already has.

It is the companions' own ground, so it is written down rather than changed.

---

## Checked and clean: nobody in the file is ever drawn as a peg

This was the thing I expected to be wrong and it is right.

- `placeCompanion` sets `npc.walkingWith=true` at its **very top** (`src/main.js:425`), before
  every early return — the arriving branch, the escorting branch and the hold branch — so all ten
  carry it whatever they are doing.
- `placeMercenaries` clears it only on the `else` path (`:391`), which `continue` has already
  taken every `with-traveler` placement away from, so a man in the file is never cleared by
  mistake.
- The stand-in reads `escorting: !!npc.escorting || !!npc.walkingWith` (`:3781`), and
  `alwaysInFull` exempts `escorting`.

So the flag survives the fight-hold that deliberately clears `escorting`, and a man at the back of
a ten-long file — 38.5 m off, which is inside the 62 m band — is a full figure like the rest.

---

## Walk into the muster with nine behind you and the Marshal says one man stands in this camp

Driven with a company built the way the host builds it, nine of the ten given as `companions`
walking with the traveler, the clock at the muster.

### The count does not see them

| | |
|---|---|
| placements at the muster | `{ "with-traveler": 9, "walking": 1 }` |
| `company.summary().mustered` | **0** |
| `musterCount` the host passes (`mustered + 1`) | **1** |

`summary().mustered` counts men whose *phase* is `mustered`. A companion's phase is
`with-traveler` and stays that way wherever he is, so **nine men standing in the camp at the
traveler's shoulder count as none of them.**

`MUSTER_EARLY` is 2, so a count of 1 is the **early** face, and what the game puts on the screen
is the pegs:

> *"The mercenaries' ground behind the standard has eleven pegs banged into it and nobody on them.
> A quartermaster's boy is counting them again in case he got it wrong the first time."*

— with ten of the eleven standing in front of him. And the Marshal: *"one stands in this camp,
counting you, and the rest are somewhere on a road."*

### And the lines are written for men who were somewhere else

`notice()` (`src/long-road.js`) records only `walking` and `stopped` placements, so a companion is
**never noticed**: `seenAt` is empty for all nine however far they walked with you. At a full
muster that makes **9 of 10 company lines** fall back to *"somewhere back down that road"* —

- *"We passed you. You were somewhere back down that road. I said you would be last…"* — from a
  man who never left the traveler's shoulder;
- *"Last I saw you, you were somewhere back down that road. I remember thinking: there is a
  person who is not in a hurry."* — from a man who was looking at him the whole time.

Neither table fits. `MUSTER_GREETINGS` is for men already in the camp when the traveler arrives;
`MUSTER_AFTER` is for men who walk in behind him (*"You beat me here"*). A companion arrives
**with** him, and there is no third thing to say.

### Smallest repairs

1. **Count them.** `mustered` should include a `with-traveler` man who is at the muster — he is in
   the camp, whatever his phase is called. One predicate, and the early face stops firing at a
   full camp.
2. **Give the file its own greeting.** A short table keyed like the other two, for a man who
   walked the whole way: nothing about passing, nothing about being beaten there. Until there is
   one, the honest fallback would be to leave a companion out of `company` altogether rather than
   have him say he last saw you somewhere else.

Both are the muster's and the long road's, so they are written down rather than changed.

---

## Check 5, as far as it goes today

- **`MERCENARY_ARMS` is in and is sensible**: every companion has a weapon family and a pair of
  levels — 20 to 45 on the weapon, 17 to 40 on toughness, Mus the highest at 45/40, Altun the
  lowest at 20/17 — and `armsOf` fills a shield of 1 for everyone but Kristen, who carries one at
  35. So a companion is a seasoned fighter, not a level-1 one.
- **"An ally at level 1 is exactly today's ally" holds on the curve**: `marginsFor` at all-ones
  gives `maxHp 100`, `maxStamina 100`, `dodgeWindow 0.37` and damage ×1, which are `combat.js`'s
  own boot numbers to the digit (measured in the phase-2 sweep above).
- **No ally's health moves with the country**, still: `countryHealth` is applied in the enemies
  loop of `encounterConfig` and nowhere else, and a level-2 `borderEncounter` builds its allies at
  the authored 90 hp against enemies at 190.
- **The third part is not measurable yet.** The border battle at level 2 with a side at its kind's
  level needs the ally wiring — where a companion becomes `combat.state.allies` — which is still
  with the builder. The level-0 and level-2 baselines to measure it against are already taken:
  **29/40 at 42 % health** and **0/40 with 1.4 of 8 down**.

---

## The long road's last stretch, walked on the real world

Every stop of legs 4 and 5 stands on ground a traveler can stand on, and the two that matter most
are within a stride of the road:

| stop | leg | standable | m from the road | named ground |
|---|---|---|---|---|
| `corvan-register` | 4 | yes | 13 | Drent / avrel |
| `rena-dig` | 4 | yes | 101 | Drent / rena |
| `enna-rows` | 4 | yes | 28 | Drent / avrel |
| `applegarth` | 4 (branch) | yes | 124 | Drent / applegarth |
| `nell-hedge` | 5 | yes | 19 | Drent / avrel |
| `silas-stream` | 5 | yes | **13** | Drent / **none** |
| `hollis-bridge` | 5 | yes | **2** | Luscia / caloss-crossing |

**Silas really is in no named ground**, exactly as `src/long-road.js` claims. The nearest
subregion centre is `caloss-bank` at **89 m against a 70 m reach**; then `caloss-crossing` at 106
against 55, and `avrel` at 107 against 75. He is outside all of them, so the only way a man is
noticed going past him is the forty metres — which is what the comment beside him says.

*One thing I measured and will not report as a fault:* a straight line from the nearest road
waypoint to `rena-dig`, `applegarth`, `nell-hedge` and `corvan-register` is blocked. That is a
naive test — those are 13 to 124 m off the road, through hedge and wood, and a player walks round
things. It says nothing except that my probe walks in straight lines.

---

## The six-regions groundwork: what moved, and what did not

Asked for at once, so measured at once.

**Something moved.** The built world is now **33,247 colliders against 33,131** before the
groundwork — **116 more** — and a sweep of the west (x −1400 to −900, z 0 to 700, every 20 m)
finds 766 standable samples, 98 swimmable and 72 solid, the swimmable ones being the rejoined
western rivers.

**Nothing that anything of mine rests on moved.**

- the Moros camp still reads **Moros Plain**;
- the main road still runs **41 waypoints**, ending at (−1378.6, 602.2);
- **Mus's wild line is untouched**: 1,610 m of authored route with **0 blocked** and **0 in
  water**, still **62.7 m** from the road at its closest authored point and **40.2 m** outside the
  41 m join, so `WILD.clearance` still holds. The 13 m that remain are the appended muster leg, as
  before, at the same coordinates.

His line runs west to x = −1070 and round the head of the bay, which is exactly where rejoined
rivers would have caught it, so it is the measurement worth having: **the western work did not
put Mus in a river.**

---

## Walk to the border battle with three companions and it will not start

**`encounterConfig` refuses any encounter with more than six allies** (`src/combat.js:135`):

```js
if (!Array.isArray(config.allies) || config.allies.length > 6) return null;
```

`getAllies` adds the company to whatever the encounter already authored, and the cap counts the
sum. Measured, adding companions one at a time:

| fight | authored allies | companions before it is refused |
|---|---|---|
| **the border battle** | 4 | **2** — the third refuses it |
| the wolves at the Lauvel | 0 | 6 — the seventh refuses it |
| the Bramble scout camp | 0 | 6 |

`startEncounter` returning false is not a small thing. It means **the fight never starts**, and
each caller has its own way of saying so:

- **The border battle (`src/main.js:2337`) becomes a loop.** On refusal it calls
  `border.endEncounter` and toasts *"The line is not ready. Stand with your commander south-west
  of the stockade."* The traveler is already standing there. Give the word again and it says the
  same thing. **With three or more companions the main arc cannot be finished.**
- **The Lauvel wolves (`:2292`) simply never come.** The call is inside an `if`, so a refusal is a
  silent no-op: the satchel is lifted off the cart and nothing comes off the burial line.
- The aftermath (`:2320`) and the hideout (`:2462`) toast and end their encounters, so they at
  least say something.

The user's decision is **"as many as will come"** — up to ten. The cap is **six, including the
side's own soldiers**, and it was sized when the only allies were authored ones: the border's four
and the hideout's three. Nothing in `companionAllies` knows about it, and nothing tells the player.

**Smallest repair:** the cap exists to bound the arena and the update loop, so raise it to what
the decision now allows — the roster is ten, the border authors four, so fourteen — or exempt the
company from it and cap only the authored list. Either way `companionAllies` should not be able to
hand `encounterConfig` something it will throw the whole encounter out for.

### What the placement itself does, which is the thing that was worried about

Nothing wrong with it. Ten companions, laid by `companionAllies` into three boxes:

| fight | box | outside the box | in an enemy | in an authored ally | in each other | on ground they cannot stand on |
|---|---|---|---|---|---|---|
| the border battle | 24 × 39 m | **0** | **0** | **0** | **0** | **0** |
| the Lauvel wolves | 39 × 39 m | **0** | **0** | — | **0** | **0** |
| the Bramble camp | 24 × 39 m | **0** | **0** | — | **0** | **0** |

Two ranks of five, back 5 to 17 m and ±2.5 m across, well inside the 21 m behind and 12 m across
that `encounterConfig` allows. The construction is sound; it is the count that is not.

### What is blocked by it

**"What lifts the hold" cannot be measured yet.** The question was how many companions, at what
levels, make a level-2 border battle winnable, and how many die doing it — and the fight does not
start with three of them. The two rows that could be run:

| level | company | won | health left | enemies down (of 8) | companions dead |
|---|---|---|---|---|---|
| 0 | none | 20/40 | 45 % | 6.3 | 0 |
| 2 | none | **0/40** | — | 1.3 | 0 |

which restate the baseline and nothing more. The moment the cap lifts, the same harness gives the
rest, deaths included.

---

## The border battle with a company: where the climax is

Traveler as the arc leaves him — Blades 17, Toughness 12 — the side's four soldiers, companions at
their own `MERCENARY_ARMS` numbers, 40 seeds a row. **"Won sitting still"** is the same fight with
the player never swinging (he still closes and dodges): the control for *does the player matter*.

| level | company | allies | won | health left | enemies down | seconds | swings | **companions dead** | who dies most | **won sitting still** |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 0 | 4 | 20/40 | 45 % | 6.3/8 | 24 | 25 | 0.0 | — | **0/40** |
| 0 | 3 | 7 | 40/40 | 74 % | 8.0/8 | 22 | 22 | 0.0 | Jerry 1/40 | **20/40** |
| 0 | 6 | 10 | 39/40 | 99 % | 8.0/8 | 29 | 17 | 0.0 | — | **36/40** |
| 0 | 10 | 14 | 40/40 | 100 % | 8.0/8 | **15** | 14 | 0.0 | — | **40/40** |
| 2 | 0 | 4 | 0/40 | — | 1.3/8 | 17 | 17 | 0.0 | — | **0/40** |
| 2 | 3 | 7 | 4/40 | 29 % | 4.4/8 | 24 | 25 | 0.8 | Jerry 22/40 | **0/40** |
| **2** | **6** | **10** | **36/40** | **78 %** | **7.8/8** | **31** | **31** | **2.0** | Kristen 25/40 | **0/40** |
| 2 | 10 | 14 | 40/40 | 91 % | 8.0/8 | 25 | 27 | 0.9 | Mus 15/40 | **8/40** |

### What the battle is like as a fight

**At the held level 0, a company ruins it.** With three, the allies win it alone half the time.
With ten, the player can stand still and watch and win **forty times out of forty, in fifteen
seconds**, having swung fourteen times. The held battle is a good climax only with **no company at
all** — 20/40 at 45 % health, and 0/40 sitting still, so every bit of it is the player's.

**At level 2 with six, it is the fight the chapter was written for.** Won 36 times in 40, at 78 %
health, 7.8 of 8 down, **two companions dead**, over 31 seconds and 31 swings — the longest and
busiest row in the table — and **0 of 40 sitting still**. Hard, winnable, costly, and the player
does all of it.

Either side of six is worse: at three it is 4/40, a wall with a death in it; at ten it is 40/40 at
91 % with the player becoming optional (8/40 sitting still) and the toll falling back to 0.9,
because fourteen allies smother it.

### The recommendation

**Lift the hold to level 2 and expect a company of about six.** That row is the climax the brief
asks for and the only row in the table that is all three things at once.

**And it is what a player will plausibly arrive with.** Of the ten who can be asked, **seven come
for the asking** wherever they are met — Chris at the landing (automatic), Ed on his shore, Jerry,
Ciarán, Matt and Al on the road, Mus in the wild — and **three are gated on doing something
first**: Kristen on the country being *charted*, Lakota on having *birded*, Eliana on the *edge*.
So a player who simply says yes to everyone lands on **seven**, and one who also does the three
skills lands on ten. Six is the floor of that band, not the ceiling — which means **the battle is
at its best for the player who did the least**, and gets easier for the one who did the most.

If ten is to stay a climax rather than a parade, the lever is not the country's level: it is
either the arena (eight enemies against fourteen allies is a fight tuned for four) or a reason for
some of the company to be elsewhere.

### Two things to read the table with

- **The deaths fall on the least experienced, which is right.** At level 2 with six, the man who
  dies is **Kristen** (25/28, the lowest of the first six) 25 times in 40; with three it is Jerry;
  with ten it is Mus. Nobody dies at level 0 in any row.
- **"Sitting still" is not idle.** The passenger still closes and still dodges — only the swinging
  is off. And the harness closes in single file with perfect facing and never misses, so read the
  win counts as a ceiling and the comparisons between rows as the real content.

### A correction to my own first pass

My first run carried a column called *player killed* which matched *enemies down* exactly in every
row. It was wrong: an ally's strike calls the same `hurtEnemy` (`src/combat.js:753`), which emits
the same `hit` event, so I was counting every kill and calling it the player's. The passenger
control replaced it and is the honest measure. That is the fifth time a probe of mine has modelled
the game from outside and believed itself; the rule in this ledger keeps earning its place.

## The traveler's buckler did not read on screen — fixed

*(kept for the lesson; the buckler now reads and the guard has a pose)*
## The traveler's buckler, as it was

The shield the traveler buys is attached and correct — `tests/shield-guard.test.js` proves the
buckler exists, hangs off the arm, toggles with the hand slot and is built once — but it does not
show in `shield-guard.png` from any of the angles tried. It is small, it sits at the elbow, and
the traveler's coat is around it. Six renders went on this before I stopped; the mechanic is
finished and tested, the picture is not. Worth either a bigger or higher-slung buckler, or a pose
that holds it out, whenever somebody is in `characters.js` anyway.

Found the same day, and fixed: `player` in `src/main.js` is a facade over a replaceable body, and
`setShield` was missing from it. The call was written `player.setShield?.(...)`, so it did nothing
at all, quietly, for four renders. **An optional call on your own facade hides your own mistake**;
it is now a plain call that would throw.

---

## The death lifecycle, walked end to end — four things wrong, all four fixed

Driven against the real modules: `createCompanions` with the real `createFallen` it shares with
the world's other dead, the real `createMercenaryCompany`, and `morosConversation` driven through
a fake `openDialogue` that answers and clicks through exactly as the host's does.
`tests/death-lifecycle.test.js` holds all of it, and every assertion named below fails against the
code as it was.

### 1. The Marshal asked after the same missing name for ever

**Seen, driven:** two men dead, the traveler at the command tent. He asks after Al the Tun, the
traveler answers, he writes it down — and then asks after **Al the Tun** again. And again. The
second name is never reached, the second answer is refused (`report` returns `{ok:false}` for a
man already told about), and nothing of the muster's own business ever happens.

**Cause.** `morosConversation` re-enters *itself* once the pen is down
(`openDialogue(..., {onComplete: () => morosConversation(npc, context)})`), and `context` is the
object `src/main.js:3156` built **before** the answer, in which `owed` was already evaluated to an
array. So the list of who is still owed is always the list from before the last answer.

```
owed at the gate: [ 'merc-altun', 'merc-mus' ]
--- after answering about the first name ---
    "He writes where, and against what, and reads it back once ..."
    "two stand in this camp, counting you, ..."
    "Al the Tun. What happened to him?"      <- the same man
told: [ [ 'merc-mus', null ], [ 'merc-altun', 'true' ] ]
owed now: [ 'merc-mus' ]      context.owed (stale): [ 'merc-altun', 'merc-mus' ]
```

The only way out in play is to back out of the conversation and speak to him again, which rebuilds
the context; with two dead that is two conversations, and nothing on the screen says so.

**Fixed.** `owed` is a question, not an answer: the host passes `()=>companions.owed()` and the
chapter calls it each time round. Everything else in that context is a fact the conversation
cannot change, and is left as it was.

### 2. A dead man went on mustering, and the Marshal counted him

**Cause.** `createMercenaryCompany` knows nothing about the dead. `companions.died` strikes a man
off the walking list, `rebuildCompany` remakes the company without him — and he therefore goes
**back onto the ordinary road schedule** and musters on it like anybody else. The host hides him
(`npc.hidden=...||fallen.has(id)`), so nobody sees him; but `summary().mustered` counts a *phase*,
and his phase is `mustered`.

Measured on the real company with one companion dead, over the clock:

| play seconds | his phase | `summary().mustered` | living men in camp |
|---|---|---|---|
| 600 | coming | 0 | 0 |
| 1,200 | walking | 1 | 1 |
| 2,400 | **mustered** | 4 | 3 |
| 4,000 | mustered | 7 | 6 |
| 8,000 | mustered | 10 | 9 |

So at 4,000 s the Marshal said *"By the gate's count, **eight** stand in this camp, counting you"*
with **seven** standing there. `musterVoices` clamps the count to `expected` (eleven less the
dead), which hides the error once everybody living is in — which is why a full muster reads
correctly and this was never caught. It is wrong for the whole of the window where any living man
is still on the road.

**Fixed** in the host, where the count is made: `musteredInCamp()` counts placements whose phase is
`mustered` **and who are not in `fallen`**, and the four places that asked for the camp's size (the
Marshal, the border conversation, the first-man-in toast and the HUD's company standing) all ask it.

**Left, and reported rather than changed:** the company still *runs* a dead man's clock and still
places him, hidden, which `docs/companions.md` says it should not ("never placed on the road again,
and never waits at a landing"). Two smaller readings come off the same fact: `travelerRank` counts
a dead man as ahead of you on the road, and `summary().arrived` counts him as landed — both are in
the one HUD line `companyStanding()` writes. Teaching `createMercenaryCompany` who is gone is the
repair, and it touches `placements()`, which 46,371-placement sweeps in
`tests/nobody-sealed-in.test.js` and the whole long-road clock rest on, so it is the company's own
ground and a decision about what a placement for a dead man should even be.

### 3. Loading a save from before the fight brought him back out of the file

**Seen, driven:** Jerry walks with you. Save. Jerry dies in the next fight. Load the save. He is
alive again — and he is **not walking with you**. He is somewhere on the road with the rest of
the company, and nothing says why.

**Cause, one of ordering.** `companions.restore` deliberately filters the dead out of the walking
list it is handed (`state.walking = data.walking.filter(id => !dead(id))`), and `dead` asks
`fallen`. `src/main.js` restored `companions` at :2739 and `fallen` three lines later at :2742, so
that filter ran against **the dying session's** list of the dead rather than the save's.

```
save BEFORE the fight: walking= [ 'merc-jerry' ] fallen= []
reload, in main.js order  ->  dead: false  walking: false
reload, fallen first      ->  dead: false  walking: true
```

A save written *after* the death was never affected: he is already out of `walking` in it.

**Fixed:** `fallen.restore` now runs immediately before `companions.restore`, with the reason
written beside it. `tests/death-lifecycle.test.js` pins both the behaviour and the order in the
source.

### 4. A lie cost five witnesses in a hundred nothing at all

The design is *"a lie is known to everyone who was walking with you when it happened, each of whom
**drops a rung**"*, and the code's own comment says "A rung, not a point". It took a flat 35 off,
which is the usual **size** of a rung and not the promise:

| witness's regard | rung | after −35 | rung |
|---|---|---|---|
| 94 | friendly | 59 | acquainted |
| **95–99** | **friendly** | **60–64** | **friendly** |
| 100 | fond | 65 | friendly |

So a man who saw you lie and happened to stand in the top five points of `friendly` thought exactly
as much of you afterwards. It is reachable: `errand` (+22) and `traded` (+14) land on flat numbers,
and a man sent on ahead stops accruing the 1.4 a minute that would carry him past it.

**Fixed:** he goes below the foot of the rung he is standing on, and never by less than the 35 that
was already taken — so every number that dropped a rung before drops the same rung by the same
amount, and the band that paid nothing now pays. Checked at 26, 40, 59, 60, 75, 94, 95, 97, 99 and
100.

### Checked on the same walk, and clean

- **Witnesses are the set captured at the death.** A man asked *after* it holds nothing; a man sent
  on *after* it is still a witness and still drops his rung. An unwitnessed lie sets
  `registerIsFalse`, and truth and silence never do.
- **The weapon.** Named ("Eliana's greatsword"), takeable once, and `take` refuses the second time.
  Never mid-fight: both the prompt (`currentFoundWeapon`, `main.js:4390`) and the taking
  (`main.js:3603`) are gated on `combat.state.phase!=='active'`. And **a death that recorded no
  place leaves nothing lying at the origin** — `died` writes `x`/`z` only when both are finite and
  `weaponOnTheGround` refuses without them.
- **The file, the page and the next fight.** `died` fires the host's `rebuildCompany` +
  `placeMercenaries`, so he is out of `fileOrder` the same frame; `refreshCompanyPage` reads
  `fallen` and names him dead with where and what; `companionAllies` skips `fallen.has(id)`.
- **Nobody can die in a teaching fight.** `TEACHING_FIGHTS` is the Greenway raid and the Avrel
  clearing raiders by id, `companionAllies` returns `[]` for them, and the straw post is
  `phase==='practice'` with one dummy and no allies at all. A man who is never an ally never emits
  `ally-down`, which is the only thing that kills him.

**Repro for each:** `node --test --test-isolation=none tests/death-lifecycle.test.js`.

---

## `tests/session-clock.test.js` was red on main, and the company review views were why

Not introduced here: the same line is in `be774c6`. `session-clock` asks that every assignment to
`playSeconds` that is not one of the two game starts sits on a line that names a review view, so
that a shot which moves the session clock can be read as a shot at a glance. The
`company-mounted` / `company-picket` views pinned it at 4,000 on the **statement line under** the
`if(view===...)` guard, which is the one pin in the file the test cannot see:

```
HEAD    starts 2 pins 4 pins without view===: [5079]
working starts 2 pins 4 pins without view===: [5099]
```

**Fixed** by moving the pin onto the guard's own line, which is the shape the other three pins
already have. The suite is green again; nothing about the shot changed.


---

## The company's horses, asked of the real ground

All of this is `createWorld` through `tests/module-loader.js` and the real `canStand`, not a flat
plane. The synthetic-ground tests in `tests/company-horses.test.js` are right about the arithmetic;
these are the numbers the ground gives back.

### Nobody is penned in, and the two that looked sealed were the probe

Ten picketed horses, with the real world's own colliders in the fill, at three places:

| | picketed | open starts that reach 25 m clear |
|---|---|---|
| Bede Harrow's yard | **10 / 10** | 815 / 817 |
| the Caloss bridge | **10 / 10** | 929 / 929 |
| the Tidehaven pier head | **3 / 10** | 319 / 319 |

The closest pair of horses is **2.20 m** in every case, which is `PICKET.spacing` exactly. With ten
the line takes both sides of his horse rather than one, at the yard and at the bridge; two parallel
lines open at both ends are still not a ring, and the fill says so.

**The two exceptions are not pens.** Each is a single 0.4 m cell with no open neighbour, and
four-connectivity is symmetric - a body that cannot step out of a cell could never have stepped
into it, so they are slivers nothing can reach rather than places somebody can be shut in. Without
the horses both walk out, so the horses do close them; they close them to everybody, including
whoever would have to be standing there.

**And a probe fault worth writing down, because the same arithmetic is in the shipped test.** My
first fill seeded its grid at `round(span / step) * step` from the origin, which with span 29 and
step 0.4 is **0.2 m away from the point it had just tested**. It reported two starts at the yard
"sealed after 1 cell" that were not those starts at all. `tests/company-horses.test.js:99` seeds
its flood the same way; on the flat synthetic ground it uses, every cell is open and it cannot
matter, but the arithmetic is there to be copied.

### The pier head picks three of ten, and draws the other seven nowhere

`picketSpots` answers `null` for a horse with no footing and the host sets `visible = false`, which
is the design ("a horse with nowhere to stand is not put down at all"). The pier is the extreme of
it: step down at the pier head with a full company and **seven horses leave the frame**, then
reappear under their men the moment he mounts again. The mounted file is worse there - **1 of 10**
riders gets a file spot and the other nine hold where they stand.

### A mounted file of ten is sixty metres long before the ground says anything

`RIDE_FILE.shoulder 4.2 + 9 x stride 6.2` = **60.0 m**, so the tenth rider is sixty metres behind
the traveler on open ground with no retreat at all. Measured over 48 facings:

| | median span | worst | facings leaving somebody unplaced |
|---|---|---|---|
| the yard, mounted | 60.0 m | **91.0 m** | 1 |
| the yard, on foot | 38.5 m | 54.5 m | 0 |
| the open road, mounted | 60.0 m | 78.6 m | 0 |
| Lumber Town square, mounted | 66.2 m | 84.8 m | 0 |

The 60 is the design; the rest is the retreat, and it is bounded at 97.2 m
(`shoulder + (9 + FILE_RETREAT) * stride`). Not reported as a fault - a file that cannot spread
goes single and long on purpose - but sixty metres is longer than it reads on paper, and it is why
the `company-mounted` review goes to the trouble of choosing a facing that needs no retreat.

*A metric of mine that was wrong, and is struck out:* I first counted "riders past the 40 m
set-down" by their distance from the **traveler**. `COMPANION_REACH.setDown` is measured from a
man's own **place**, which he is standing on, so nobody is teleported by a long file. The corrected
column is above.

### The finding: a man on foot can be given a place inside a horse

**The file's footing test is `canStand(x, z, world)` - the static world.** The picketed horses and
the traveler's own bay are *bodies*, not colliders, so `fileSpotFor` cannot see them, and
`picketSpots` cannot see the file either: two layouts, each blind to the other, laid from two
different origins (the file from the traveler, the picket from his horse).

Measured at Bede Harrow's yard, ten on foot with ten picketed, over 48 facings: **3 of 48 put at
least one man inside a horse.** At the hitch's own facing it is Kristen, **0.56 m** from a horse's
centre where a man needs `BODY.person + BODY.horse` = **0.80**. On the open road it is 0 of 10.

And in the shot the game takes of itself: `--review-views=company-picket` puts **Chris 0.32 m from
the traveler's own bay** - a man standing in the middle of a horse.

**How much it shows.** In ordinary play the mover saves it: the spot is only the man's *home*, and
`stepAround` runs against a body list that does include both horses, so he presses up against the
animal and settles about 0.84 m out. What it costs is that his home stays inside the horse, so he
leans on it for as long as he stands there - the same class as the hired sword who marched on the
spot against a hedge. Where it is not saved is any path that **snaps** a man onto his spot rather
than walking him there: `settleMercenaries()`, which is a load, a story start and every review
view. That is how the picket shot got Chris into the bay.

**Not fixed, because it is a decision about which layout yields.** Either the file learns to treat
a horse as ground it cannot stand on - the horses are already solid to everybody else - or the
picket is laid after the file and steps around it. The first is the smaller change and puts the
test where it belongs (one footing predicate, the way `RIDE.radius` is one footing test for both
mounts), but the picket is computed in `refreshCompanyHorses` after `placeMercenaries`, so somebody
has to decide which of the two goes first in the frame.

### Checked on the same walk, and clean

- **A rider who halts stays in the saddle.** Already mended at `src/main.js:4248-4252`; the seat is
  a fact about the man and not about whether he is moving.
- **A fight, water and the ferry all bring the company down, and none of them needed a line.** The
  fight unseats him (`main.js:4052`), the ferry **refuses** while he is mounted
  (`src/ferry.js:122`, "Not with the horse"), and a horse will not enter water at all - so in all
  three the traveler is on his feet and the one rule puts the company on theirs.
- **Chris rides.** The host reads the *placed file* and not the companions list, which is the one
  place the landing mate would otherwise have fallen through.

---

## The smiths: checked, and I could not break them

- **Buying is atomic from both sides.** `buyFromSmith` takes the money only after the piece is
  validated and the purse covers it, and hands it back if `gear.wear` refuses.
- **No action can buy what is not on today's board.** `smithAct` does not trust the action string:
  it rebuilds `smithStock(level)` from the country the traveler is standing in and *finds* the
  piece in it, so an action naming anything else resolves to `undefined` and buys nothing.
- **Each sells the country he stands in**, because the level is read from `world.regionAt(player)`
  at the moment of the conversation rather than written beside the man.
- **Nothing reaches tiers 5 or 6.** `tierSoldAt` walks `TIERS`, and tiers 5 and 6 have `sold: null`,
  so the ceiling is tier 4 at country level 7; `validPiece` refuses an unnamed tier everywhere but
  a save, which may carry one because the naming is what is missing and not the thing.
- **All three are reachable**: `tests/nobody-sealed-in.test.js` already adds the two host-placed
  smiths to the world's own people by hand, and Mern is in `world.npcPositions` with the rest of
  Ostel.

---

## The shield's guard: read closely, and one thing worth knowing

Every condition the brief asks for is in one predicate, `guarding()` (`src/combat.js:376`): a
shield in hand, an active fight, an **idle** body, alive, and wind to pay. The catching branch
(`:525`) returns before the line that sets `player.action='hurt'` and before `moveCharacter`, so it
never rocks him, and it sets no invulnerability - a dodge is still the only thing that makes a blow
miss. `TODAY` carries `hasShield: false`, so a combat wired to nothing has no guard and is the old
game to the digit. This is the builder's ground, so it was read rather than changed.

**One thing to know before anybody tunes it:** the host ran `combat.update(dt)` *before*
`combat.guard(key, facing)`, so **a blow was resolved against last frame's key and last frame's
facing**. Sixteen milliseconds, and harmless in a fight. The one place it was visible in principle
was the first playing frame after the defeat panel: `combat.guard` is inside `if(mode==='playing')`,
so a player who let go of V while the panel was up had a stale `guardHeld` for exactly one
`combat.update`.

**Fixed with phase 7's host work** (2026-09-21). The guard is now offered *before* the fight is
stepped, and the latch is let go on any frame that is not play — `if(mode!=='playing')
combat.guard(false, ...)`, above the playing branch, so nothing can read a held key the player is
not holding. A frozen review is deliberately left alone, because `shield-guard` holds the guard by
hand and then stops the clock. Both halves are pinned in `tests/shield-guard.test.js`
("the guard is offered before the fight is stepped"), by *order* rather than by line number.

---

## The rebel crew rode the session clock, and two things the render showed

### Fixed: her deck was on a clock the save does not carry

Everything about this arrival is a function of `playSeconds` - where she is, which way she heads,
how far the two at the rail lean, when the village says its five things. The men standing on her
were not: `src/main.js` handed the hull `elapsed`, the **session** clock, which starts at nought
every time the game is opened. So `crewPose`'s `sway`, the helmsman's `turn` and the sail man's
`lift` were different at the same second of the same arrival after a reload - up to **0.26 rad, 15
degrees, of helmsman**. `src/rebel-crew.js` says in as many words that a reload mid-arrival shows
the right pose "without anything being saved", and `src/word-arrival.js:111` repeats it; it was
true of her hull and false of everybody on it. One token, and
`tests/rebel-crew.test.js` now pins the clock and measures what the wrong one was worth.

*Note for whoever owns the Sultana:* `src/main.js:4364` hands her `elapsed` too. She makes no
promise about reloading, so it is left alone and written down here.

### The helmsman is standing inside the deckhouse

Seen in `--review-views=word-crew`: the man aft shows from the chest up, with the rest of him
inside her deckhouse.

| | |
|---|---|
| `rebel-helm` | z = **−4.44** (`−L × .74`), feet at `DECK_Y` **1.16** |
| the rebel deckhouse (`src/salt-ship.js:168`) | centred z = −3.72, **z −4.98 to −2.46**, y **1.205 to 2.155**, with a tarpaulin over it at 2.2 |

So he stands 0.54 m inside its after end, and his legs and hips are inside a solid box whose roof
cuts him at the chest. `tests/rebel-crew.test.js` checks every man against her **bulwarks** - beam
and length - which is a flat box and cannot see anything standing on the deck.

**Why it is written down rather than moved.** Where a helmsman should stand on a hull whose stern
is a deckhouse is a staging choice, and the room is tight: the test's own bound is `|z| < L × .86`
= 5.16, and the house's after face is at 4.98, so **abaft the house there are 18 cm**. The two
places that exist are forward of the house (z between −2.46 and 0, which is amidships and not where
a tiller is) or lowering / shortening the house at its after end so a man can stand at the tiller
under the break of it. Both change the picture the user has seen.

### And one that is the review, not the game

In the same shot Ed appears to be **standing upright on the water** rather than swimming. He is
not: `swimmerAt(WORD_SHIP.drops)` answers `swimming: true`, the host sinks him to
`WATERLINE − SWIM.sink` and passes `swimming: true` to his animator. What the picture shows is the
swim stroke **at stride phase 0**, which `src/characters.js:801` makes: `reach = sin(0) = 0` for
both arms, so `arm = −.58`, `armOut = ±.46`, `hip = −.22`, `knee = .3` - arms out at the sides,
legs straight, chest back. A frozen review stops `walkTime`, so an NPC is photographed at whatever
phase the clock is on, and phase nought of a swim looks like a man standing.

This is the same family as the guard pose that would not draw, and the answer is the same shape:
`settlePose` runs the **player's** animator forward before a frozen shot, and nothing does that for
an NPC. Anybody reviewing a moving NPC should advance `walkTime` first, or read the shot knowing
this. No change made: it costs nothing in play, where the clock runs.

---

## Two tests were red on `main` before any of this, and both are mended here

Found while running targeted files, confirmed against `be774c6`, and neither is anything this
branch did.

1. **`tests/session-clock.test.js`** - "everything subtracted from playSeconds is reset wherever
   playSeconds is". It asks that every pin of the session clock sit on a line naming a review view.
   The `company-mounted` / `company-picket` views pinned it at 4,000 on the statement line *under*
   their `if(view===...)` guard - the one pin in the file the test cannot see. Replayed against both
   copies: `HEAD pins without view===: [5079]`, working: `[5099]`. The pin moved onto the guard's
   own line; the shot is unchanged.
2. **`tests/word-arrival.test.js`** - "the host puts her on the water… with the swimmer's posture".
   It matched `/swimming:!!npc\.swimming\}\);/`, which required `swimming` to be the **last key**
   of the object handed to an NPC's animator. The company's horses added `riding:` after it. The
   sentence was still true, so the anchor was moved onto the call - `npc.actor.animate(… swimming:
   !!npc.swimming` - rather than onto the shape of the object.

**The lesson, since both are the same one:** an assertion that pins a key's *position* in an object
literal is an assertion about something nobody promised. Both of these went red on work that did
exactly what it was supposed to do.


---

## Round 2: the four rulings, built

### 1. Men yield to horses — fixed

The file's footing test was the static world, and a picketed horse and the traveler's own bay are
*bodies*, not colliders, so the two layouts were blind to each other. The ruling: the horses are
laid first, because a picketed horse's place is a function of the traveler's own horse, which the
save carries, while a man's place is recomputed every frame.

**What was built.** One function, `companyHorseGround()` in `src/main.js`, answers with the rule,
the picket line and **the bodies a man must not be given** — the traveler's bay while he is off
it, and every horse standing on the picket. `placeMercenaries` seeds `fileTaken` from it before
the first man is placed, and `refreshCompanyHorses` reads the same function to draw them. It is
**computed by both, not stashed by one for the other**, so the two halves of a frame cannot fall
out of step and every snapping path — `settleMercenaries`, a load, a story start, every review
view — gets it for nothing.

`fileSpotFor` (`src/company-horses.js`) and the per-man fallback ring now honour **a room on the
entry**: `Number.isFinite(other.room) ? other.room : room`. A man needs `BODY.person + BODY.horse`
= 0.80 m from a horse's centre and `BODY.person * 2` = 0.68 from another man, and a ridden horse
is no obstacle at all because its man already is, at a rider's own footprint.

**Measured on the real world, ten men and ten picketed horses, over all 48 facings:**

| | men given a place inside a horse | left without ground | worst span |
|---|---|---|---|
| the yard, file blind to them | **4** | 0 | 54.5 m |
| the yard, file yielding | **0** | 0 | 54.5 m |
| the open road, blind / yielding | 3 / **0** | 0 / 0 | 50.5 m / 50.5 m |
| Lumber Town square, blind / yielding | 3 / **0** | 0 / 0 | 50.5 m / 50.5 m |

**It costs nothing.** Not one man loses his ground and the file trails no further, which is the
column that would have said the repair was too expensive. In the picket review's own geometry the
nearest man to a horse goes from **0.63 m to 1.26 m**. `tests/company-file.test.js` holds all
three claims — nobody inside a horse, nothing lost by yielding, and the host's own wiring — with
the blind file kept as the control, so the test fails if the fault is ever put back.

**And the probe fault is mended where it shipped.** `tests/company-horses.test.js`'s flood seeded
its grid at `round(span / step) * step` from the origin, which with span 29 and step 0.4 is 0.2 m
from the point it had just tested. On its flat synthetic ground every cell is open and it could
not matter; on the real world the same arithmetic reported two starts at Bede Harrow's yard sealed
that were nothing of the kind. The grid is aligned to its own start now.

### 2. The helmsman stands on the house — fixed

He was inside her stern deckhouse with the roof cutting him off at the chest. The house is not
moved, lowered or shortened: **her stern house is his steering platform**, which is what a low
poop is.

The numbers are now one description, `REBEL_STERN_HOUSE` in `src/salt-sultan.js`, beside the hull
— because a thing that stands on her deck is something anybody standing on her deck has to know
about. `src/salt-ship.js` builds the house from it, `src/rebel-crew.js` exports `POOP_Y` (2.25, the
top of the tarpaulin) and `overTheHouse(x, z)`, and a man's row carries his own `y`, which is
`DECK_Y` for the four on the deck and `POOP_Y` for the one at the tiller.

`tests/rebel-crew.test.js` now checks every man **against what stands on the deck and not only
against her bulwarks** — which is what let this pass: a beam-and-length box cannot see a
deckhouse. Each man is either over the house with his feet on it, or on the deck and at least
0.3 m clear of its sides; exactly one is up there and he is the one at the tiller; and the house's
own four numbers are pinned so nobody makes room for him by shrinking it.

**Looked at.** `--review-views=word-crew`: he reads whole, above the house, aft, at the tiller.

### 3. The dead man's clock, in the company's own ground — fixed

`createMercenaryCompany` takes `dead` the same way it takes `companions`, and for the same reason:
a companion's death is permanent and the clock had no other way to learn of one.

- **A dead man has no placement at all.** `placements()` returns the list with his hole closed and
  **nothing else moved** — the roster index is still his, so nobody's formation shifts when he
  falls.
- `summary()` therefore counts him under nothing, `arrived` is the living less those still coming,
  and there is a `dead` count for anybody who wants it.
- `travelerRank` never has him ahead of the traveler, because he is not in the list it filters.
- `companionId` / `companionIds` drop him too, so the file and the horses hung off it answer for
  themselves whatever list still names him.
- `musteredInCamp()` in the host is now **`company.summary(playSeconds).mustered`**: the host asks
  instead of subtracting.

**Undefined or empty is today's clock to the digit**, which is the rule every addition to that
module has kept: with no dead the mapped array is handed back untouched, and
`tests/death-lifecycle.test.js` drives `undefined`, `[]`, `null` and rubbish against a company
built without the argument at seven moments of the clock, on `placements`, `summary`,
`travelerRank` and `companionIds`.

**Two places that indexed `placements()` by row**, and would have handed a man his neighbour's
place the moment the list had a hole in it, are by name now: the figures built at the first frame
(`src/main.js:381`) and the character swap (`:668`). Neither could be reached with a dead man
today; the invariant is cheaper to keep than to remember.

**And a dead man is put out of the world.** He has no placement, so the loop that used to hide him
every frame never reaches him again — he would have gone on doing whatever he was doing the frame
he fell. `placeMercenaries` sets `fallen` and `hidden` over the company's dead before it places
anybody, which is the same pair of flags the Greenway raid sets over a villager it kills.

### 4. The normal-mode pass

**Swept:** speech and the aside, signs, the phrasebook, Chris's five sittings, the skill tile and
what a character lands knowing, the journal, the character sheet, and every string in `src/`
matching *interpret*, *phrasebook*, *tongue*, *cannot follow*, *does not speak*.

**Every surface is shut, and each by its own gate.** The speech panel returns the authored line
and clears the aside **before** anything is heard into a tongue, so nothing is even paid for;
`setSignReader` is called only under the gate, and with no reader `signText` answers the label
itself, for every word the atlas carries; Wendel's stock drops the phrasebook and his opening line
is the one that does not mention one; the drill choice is not offered; the linguist's experience
and Chris's starting tongues are both behind the gate, and the character sheet is handed the
hidden list so nobody reads a Linguist level off it. Driven and pinned in
`tests/game-mode.test.js` and `tests/signs.test.js` — the sign test sets a reader who has no
tongues and watches the foreign boards come back, so the English one is the gate working and not
the atlas being English anyway.

**Rendered with the interface showing** (no `--review-clean`): `road-dialogue` and
`waymarker-before`. Corvan's four lines, the quest panel, the region card, the two toasts and the
key strip are all plain English, and there is no aside.

**One line fixed, because it is unambiguous.** `src/journey-content.js:105` — Corvan's first
line began *"the letter of introduction?"*, lower case, and reads on screen as a fragment with its
opening words missing. Capitalised, and nothing else about it touched.

**Reported, not fixed:**

- **The lettering atlas still carries every foreign word in normal mode.** `FOREIGN_SIGN_LABELS`
  is computed at module load in `src/signs.js`, with no mode in sight, and `SIGN_LABELS` is both
  sets. Nothing can show them — `signText` answers the plain label with no reader — so this is
  cost and not copy: the atlas is taller than a normal-mode game needs. **The sign atlas is
  another agent's ground**, so it is written down here.
- **Two lines gloss a place name with "in your tongue"** — `src/wine-attic.js:121` ("Tharganhom.
  The Wine Attic, in your tongue.") and `src/wine.js:226` ("This is Paradise Springs. In your
  tongue, …"). Left alone on purpose: a foreign *name* having a meaning is true in both modes,
  and these are about a name and not about what the speaker is speaking. Worth a glance from
  whoever owns the copy.
- **`longRoad.view().finished` can never be true in normal mode**, because it wants five drills
  and the drills are hard mode's. Checked every reader: nothing reads it, so nothing is blocked.
  It is written down so that whoever gives it a reader knows.


---

## The ten-man mounted file, rendered at last — and what the render found

There was no view of the thing the arithmetic says is sixty metres long: `company-mounted` and
`company-picket` are about the yard and carry three men on purpose. `company-ten` is the whole
company, mounted, on the road out of Lumber Town.

### The first shot found a rider under the traveler's horse

The camera was buried in the town and the picture was of empty ground, so the facts line answered
instead of another guess. It said the file had formed — ten up, ten ridden — and it said this:

| | back from the traveler's horse |
|---|---|
| Chris | 4.7 m |
| **Ciarán** | **1.9 m** |
| Ed | 10.7 m |
| … | … |
| Mus | **97.5 m** |

**1.9 m between two mounted men**, where `RIDE_FILE.room` is 2.6 because "a horse is about 2.4 m
nose to tail". His own file spot did not stand, so he fell back on the escort ring — and the ring
is a list of close-in offsets measured from the traveler, with nothing to stop it putting a man on
top of him. **`fileTaken` never contained the traveler.** It is exactly the class the horses' fix
had just closed, one body further in: `fileSpotFor` measures *back* from him and so can never be
handed his ground, and that is precisely why nobody had ever had to put him in the list.

**Fixed:** `placeMercenaries` pushes the traveler into `fileTaken` with a rider's room when he is
mounted and a man's when he is not. It bites only on the fallback path, which is where it was
wrong.

**And 97.5 m is the retreat's own ceiling** (`shoulder + (9 + FILE_RETREAT) * stride` = 97.2, plus
the seat offset). Beside a town the shoulder spots fail all the way down the file, so it goes
single and trails to the end of its rope. Not a fault — that is what "single and long" is for —
but it is what a company looks like if the traveler stops his horse in a street.

### The second shot, two waypoints out of the gate

| | |
|---|---|
| riders up, on their own horses | **10 of 10** |
| closest pair, the traveler counted | **4.69 m** (room is 2.6) |
| file length | **60.2 m** |
| spacing, man to man | 6.2 m, every one of them |
| camera, stood back | the full 48 m asked for |

**60.2 m against the arithmetic's 60.0** (`shoulder 4.2 + 9 x stride 6.2`), with **no retreat at
all**: on open ground every man takes his own place at his own shoulder. Looked at, it is eleven
riders in a single even file coming out through Lumber Town's gate, each on his own coat. That is
the picture `docs/companions.md` describes, and it had never been seen.
