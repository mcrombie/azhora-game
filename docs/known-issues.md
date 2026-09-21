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

## Five of the ten hired swords wait on the harbour floor

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
| 3 | Christin | 3.1 m | 21.3, 31.6 | −5.75 | 90 s from t=1080 |
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
Christin.

## `route` is written on every hired sword and read by nothing

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
`regionNameAt(barrierX ± 3, z)` along the span. In play: cross the plain west from the army camp
and watch the card change before the fence.

## Half of the walkable west lies outside every region, and the card named it anyway (fixed)

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

**Repro:** no test covers it. Headless: flood from Ambron as above and count reached cells for
which no `insideRegion` is true. In play: walk south off the Nesdor Flats and keep going; the
card still says Nesdor a kilometre later.
