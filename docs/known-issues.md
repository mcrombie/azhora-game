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

## Six foods exist, heal, and cannot be got

**Seen:** nothing, which is the problem. The satchel describes hazelnuts, bramble berries,
Avrel apples, acorn flatbread, honey cakes and roasted chestnuts; a traveler will never hold one.

**Measured.** Every item id in `INVENTORY_ITEMS` was matched against every source in `src/` —
anything that calls `inventory.add(id)`, any reward table, `PEDDLER_STOCK`, `ATTIC_WINES`, and
every other literal use of the id. Six ids appear in exactly two places and nowhere else:

| item | heals | its own "you have none" line says to look |
|---|---|---|
| `hazelnuts` | 15 | hazel thickets where the forest meets the fields |
| `bramble-berries` | 15 | the thorn tangles the bramble goblins are named for |
| `avrel-apple` | 20 | the Avrel valley orchards |
| `acorn-flatbread` | 30 | Lysa bakes it from leached acorn meal at her outdoor kitchen |
| `honey-cake` | 35 | Lysa's little cakes need acorn meal and bee-fold honey |
| `roasted-chestnuts` | 30 | down from the Amod terraces by the sackful each autumn |

The two places are `src/inventory.js` (name, icon, brief, description) and `src/consumables.js`
(healing and the missing message). No third.

**Why it is not just unbuilt content.** Four of the six name things the game already has.
Lysa stands at her outdoor kitchen in Tidehaven and the acorn quest runs through her; Troy keeps
the Bee Fold and honeycomb has had a source since he arrived; the Avrel clearing is built and has
crop fields; the Amod terraces are built. The fifth, bramble berries, names the bramble goblins,
who attack the village in the tutorial. So each one reads as a source that was meant to follow
and did not, rather than as a larder written for a country that does not exist yet.

`tests/foods.test.js` cannot catch this: it checks the larder against itself — that every food
is a stackable satchel item, that the brief and description quote the healing, that eating one
works — and nothing about the larder's own consistency says whether a traveler can fill it.

**Ways out, each a different decision:**

1. Put them where their own text says they are: a hazel thicket and a bramble tangle to gather
   from at the forest edge (`src/woodland-life.js` already gathers pawpaws and sticks this way),
   apples in the Avrel orchards, chestnuts sold or given in Amod. Most work, and it is the answer
   the text has already promised.
2. Give Lysa the two she is named for. `acorn-flatbread` and `honey-cake` both want acorn meal,
   which the acorn quest already collects, and `honey-cake` wants bee-fold honey, which Troy sells.
   That is a recipe each in `src/cooking.js`, which today holds only two.
3. Stock them at the peddler. One line each in `PEDDLER_STOCK`. Cheapest, and it makes six pieces
   of writing about where food comes from into six prices.
4. Delete them. Also a decision, and it costs six good descriptions.

**Repro:** `grep -rn 'hazelnuts' src/` returns two lines. So does each of the other five.

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

**While checking it, a smaller thing.** Of the 2,523 placements where a man is walking the road
or stopped at a stop, **140 (5.5%) put his home inside a collider** - a hedge, a post, a cart -
because the lateral offset is up to 4.6 m walking and 10.1 m stopped. He never stands in it:
`src/main.js` steers him there with `stepAround`, which goes through `moveCharacter` and stops
him beside the thing. It is recorded rather than fixed, and the test holds a ceiling of 8% so
that it cannot quietly get worse. The muster is clean: 43,326 placements, none blocked.

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
