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

## A test says the Ela-south runs off the edge of the world, and the world is about to grow

**Seen:** nothing yet. This one breaks the day the four western regions land.

**Measured.** `tests/elagos-world.test.js:130`:

```js
// The reach leaves the built world rather than stopping in the middle of it.
assert.ok(points.at(-1).x < WORLD_BOUNDS.minX, 'the Ela-south runs off the west edge of the world');
```

| | |
|---|---|
| the Ela-south's last point | x = **-1625.0** |
| `WORLD_BOUNDS.minX` today | **-1610.0** |
| the margin the assertion lives on | **15.0 m** |

Elagos is the westernmost region today, from x = -1550 to -850, and the world's edge sits 60 m west
of it. Four new regions to the west will move `WORLD_BOUNDS.minX` by far more than fifteen metres,
and this assertion fails — not because anything about the river changed, but because the river now
ends *inside* the map. The obvious reading of the failure is "extend the Ela-south", which is the
wrong repair: the reach is the right length, the world moved.

**What the test means to say** is that the reach leaves the country it belongs to rather than
stopping in the middle of it. That is true of Elagos and stays true whatever lands west: the
endpoint is **75 m west of Elagos's own outline**, against 15 m west of the world's edge. So the
one-line alternative is to compare against the region rather than the world — the outline is
already imported into that file as `REGION_OUTLINES`.

**Why it is written up rather than fixed here.** `src/elagos-world.js` is being rebuilt for the lake
city on one branch and the western regions are being added on another; both touch this ground, and
whoever lands the western regions is the one who will see the failure and should choose the repair.
Nothing else in the test suite pins the world's western edge: the only other `WORLD_BOUNDS.minX`
assertion is `tests/regions-world.test.js:40`, which checks the world reports the bounds it was
given and is true at any size.
