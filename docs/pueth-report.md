# Pueth: what was built

The build report for `docs/pueth-brief.md`. Pueth, the level 1 province north of
Drent, is the fifth playable region: its 27 authored hexes, both of the rivers
the map gives it, a road north out of Drent over the border river by a timber
bridge, the Legion's road post at the Pueth end of that bridge, a birch-and-fir
south, open valley grass and bare hills, a first Rimeholt on the Feradom road,
and the Bramble Scout Camp, moved out of Luscia to the woods north of the Tessen
with its garrison.

## What the map gave, and how it was used

**The region.** `assets/azhora-dev-regions.json` already carried Pueth; adding
`'Pueth'` to `PLAYABLE_REGIONS` (`src/region-layout.js`) and to `PLAYABLE` in
`scripts/build-region-survey.mjs`, then regenerating `src/region-survey.js`, gave
the game its 27 hexes: 15 grassland, 7 hills, 5 plains, in axial q 10–17, r
100–105. The survey window already reached far enough north, so `LAND_HEXES` did
not change. At 100 m per hex Pueth spans x −700 … 150 and z −548 … −8 in world
metres. Its neighbours on the map: Drent to the south, Feradom north and
north-east, Amod west, a lake on its west edge (two unclaimed lake hexes, which
the world draws as water like any unclaimed hex) and the sea on its east coast.
The map names no settlement in Pueth.

**The rivers.** `map.rivers` holds 572 river edges. Twelve of them touch Pueth's
hexes, and they chain into exactly two rivers, both small. Nothing inside Pueth
is a river on the map, so nothing else is water.

- **The Tessen** (the name is new, in the Drentish manner of the Avrel, the Torn
  and the Caloss): seven edges along the eastern half of the Drent–Pueth border,
  exactly as the user described, "along part of the border". Raw course, source
  to mouth, in world metres: (−200, −202) → (−150, −173) → (−100, −202) →
  (−50, −173) → (−50, −115) → (0, −86.5) → (0, −28.7) → (50, 0.1), 404 m. West
  of its source the border runs on without a river.
- **The Ordel**: five edges along the Pueth–Feradom border in the north-east
  hills: (−50, −519.5) → (−50, −462) → (0, −433) → (0, −375) → (50, −346) →
  (100, −375), 289 m, reaching the coast where Pueth, Feradom and the sea meet.

The edges are baked by a new generator, `scripts/build-region-rivers.mjs`, into
`src/region-rivers.js` (the raw hex pairs and sizes, with the map's SHA-256); it
reads the map the way `scripts/export-world-map.mjs` does. Chaining and softening
are geometry and live in `riverCourses()` in `src/region-layout.js`: edges that
share a hex corner join, three-way corners break a chain, and two Chaikin passes
soften each course, as the journal chart draws it. `tests/pueth-world.test.js`
re-derives the generated file from the map when the World Builder repo is beside
this one.

**One deviation, at the Tessen's mouth.** The map's last two edges run the Tessen
south through the carried-over ground north of Tidehaven, 58 m from the landing,
to the sea just north of the pier. That ground is Tidehaven's own height field and
woodland (its trees, acorns and squirrels are tested down to the index), and the
brief holds it rigid, so the built Tessen follows the map to the corner at
(0, −86.5), the last one outside that ground, and then meets the Stills by the
shortest way east: (0, −86.5) → (60, −92) → (135, −96), `TESSEN_MOUTH_REACH` in
`src/pueth-world.js`. The mouth is about 130 m north-east of the map's; everything
upstream is on the map's line (the test checks every authored edge lies within
16 m of the built river, and that the built river never enters Tidehaven's
ground). The constant `TIDEHAVEN_GROUND_REACH` (124 m) is checked against
`villageWeight` so the two cannot drift apart.

**Brought in like the Caloss.** Each river is a ribbon of water on the Caloss's
shader material, a channel cut into the terrain (`groundWithRiver` in
`src/world-terrain.js`), water blockers everywhere but the bridge lane, reeds and
bank stones, and a chart polygon (`tessen-water`, `ordel-water` in
`world.mapWaters`) that the trail charts and the minimap read. Pueth's rivers
cross hills the Caloss never meets, so their surface is sampled along the course
(smoothed over about 50 m), may only fall toward the sea, and cuts down through a
rise with a valley that widens with the depth of the cut; the Ordel runs through a
small gorge in the bare hills. A small river starts at 45 % of its width at its
authored source and reaches full width (8.4 m for the Tessen, 7.2 m for the Ordel)
over 60 m. Fishing was cheap: one bank on the Tessen, `tessen-bank`, 20 m downstream
of the bridge on the Pueth side.

**Not built: Drent's own small rivers.** The map also has two small rivers wholly
inside Drent: a 58 m tributary edge (14,104 | 14,105) from (−100, −86.5) into the
Tessen at (−50, −115), and four edges in south-east Drent from (−150, 231) to
(−250, 58). Neither is inside Pueth or on its border, so they are outside this
brief; they are listed here so that whoever next touches Drent can build them.

## The places

Pueth is authored **directly in world metres**, not in the 56 m frame. It never
existed at 56 m, and the Tidehaven cluster's 190 m radius would capture any 56 m
literal in southern Pueth and pin it to the village. If the scale changes again,
Pueth's places need clusters in the new frame. The table gives the 56 m
equivalent (plain scaling about the anchor) for reference only.

| Place | World (x, z) | 56 m equivalent |
| --- | --- | --- |
| Road junction on the main road, 38 m past the Caloss Gate | (−214, 27.4) | (−119.8, 28.1) |
| The Tessen bridge, centre of the deck (deck z −186.2 … −203.2) | (−100, −194.7) | (−56, −96.3) |
| The Tessen road post, yard centre | (−117, −228) | (−65.5, −114.9) |
| Post gate / watch hut / beacon | (−109.5, −228) / (−120.5, −232.5) / (−111, −216.5) | |
| Captain Decimus Varo (at the gate) | (−105.2, −229.5) | (−58.9, −115.8) |
| Legionary Casso (at the bridge head) | (−105.4, −208.6) | (−59, −104.1) |
| Legionary Brill (on the north road) | (−107, −246) | (−59.9, −125) |
| Camp side trail leaves the road | (−100, −212.5) | (−56, −106.2) |
| Bramble Scout Camp, centre | (55, −190) | (30.8, −93.6) |
| Camp approach (checkpoint) / stolen stores | (64, −175) / (50, −200) | |
| Camp local frame origin, yaw π/2 | (173, −130) | |
| Tessen bank fishing spot | (−80, −201.5) | |
| Rimeholt square | (−335, −362) | (−187.6, −190) |
| The Tessen Shallows | (100, −110) | |
| Birch Landing | (76, −246) | |
| The Grey Shoulder (cairn, hills) | (−268, −500) | |
| The Cold Hearth (east) | (−40, −418) | |
| The Ordel Mouth | (84, −349) | |
| The Feradom Road barrier | (−424, −522) | |

**The road north** (`PUETH_ROAD`, 796 m, 24 vertices) leaves the main road on
its straight west of the Caloss Gate, 24 m outside the rigid Tidehaven ground, so
nothing in the village moves and the Greenway's own scatter never meets it. It
runs north through Drent's forest, swings east to take the Tessen square on, at the
river's northern bend where it runs due east, crosses by the bridge, passes the
post and bends north-west through the birch and the valley grass to Rimeholt, then
north into the hills to the Legion's closed barrier on the Feradom road. The
deck's two ends are road vertices, so the road is straight across the water (the
Caloss's six-degree corner, which the scale report left open, does not recur);
no bend on it is sharper than 24°.

**The Tessen bridge** is a timber trestle: a 17 m deck 4.8 m wide at 5.4 m, 1.6 m
above the water, stringers, piles braced across, handrails, and log abutments.
The deck is `heightAt`'s second deck (`world.js` now keeps a list), rails are
small colliders over the water only (so there is no standable ledge beside the
deck, the fault the scale work found at the Caloss), and water blockers near the
crossing are pushed to the lane's edge. The road rises to the deck over a 20 m
embankment on each bank rather than stepping down into the cut. Signposts stand at
the junction ("The Tessen Bridge" / "Tidehaven"), at the bridge ("Rimeholt" /
"Tidehaven") and at Rimeholt's south gate, with the current `trailSign` helper
(two labels added to its atlas).

**The road post** is a palisaded yard west of the road with its gate on the road,
a plank watch hut, a tall beacon of split birch over the bridge, a Legion
standard, a spear rack and stores. The three soldiers stand at the gate, the
bridge head and the north road.

**Rimeholt** is a first version: a ring palisade 40 m across with gate posts and
lintels where the road passes, nine buildings (the Legion's garrison house with
its standard, the Birch Bench inn, the reeve's hall, five houses and a store), a
well, a timber yard shed with three stacks of pale cold-birch, a loaded birch
cart and fences, and six people (`src/pueth-people.js`): Asa Dunmore the reeve,
Wenna of the Birch Bench, Joss the yard foreman, Dagny the carter, Old Harl the
trapper, and Legionary Otho, a sentry at the garrison house who speaks in orders.
The east is rumour in their mouths (fires in the east hills, "the east's
business"); the hill goblins are the trapper's story.

**The biome** (`REGION_BIOMES.Pueth`, `ownScatter`) is built by
`src/pueth-scenery.js` in blocks of two hexes like the other regions, sharing the
toolkit, materials and instancing: trees thick by the Tessen and thinning
northward (birch on open ground, fir on the colder slopes, Drent's broadleaf
reaching over the river in the south), fewer on the coastal plains, almost none
on the hills; many more rocks on the hills; paler, greyer grass. The ground is
tinted per hex: Pueth grass `#7f9175`, hills `#8f9585`, coastal plains
`#8c9a78`, and the hills stand high (base 19 m, relief 9 m) against the valley's
7 m. `terrainMix` now refines a region's profile by a cell's atlas terrain where
the region asks (`byTerrain`), and its weights are derived from `REGION_TERRAIN`
rather than a fixed list. Review screenshots confirmed it reads colder and barer
than Drent at a glance.

**Hills, east and coast** have terrain, scatter and one or two landmarks with
discovery text each and nothing else: the Grey Shoulder cairn; the Cold Hearth,
a turf shelter with boot prints going east; Birch Landing's unloaded stacks; the
Ordel Mouth marker; the Tessen Shallows, where the goblins wade.

## The goblin camp moves to Pueth

- **The site.** `HIDEOUT_SITE`, `hideoutToWorld` and `HIDEOUT_CLEARINGS` moved
  from `src/region-world.js` to `src/pueth-world.js`. The camp keeps its authored
  local layout (`src/forest-hideout-world.js` is untouched) and is turned a
  quarter turn (`hideoutToWorld` now handles any yaw), so its own trail runs north
  into the camp and the way out of the fight is south, back down the trail: the
  retreat axis is `z` (+z), the retreat line z = −167, 8 m past the approach.
  It stands in the coastal woods east of the post, 155 m off the road, 98 m from
  the Tessen, on the flattest ground a search found (0.9 m of relief across the
  camp). A side trail of 184 m leaves the road just north of the bridge, round the
  river's bend, marked by four scraps of the same blue cloth, and joins the camp's
  own 59 m trail. Everything the quest uses is derived from the site:
  `FOREST_HIDEOUT_QUEST` in `src/forest-hideout.js` no longer holds a single
  56 m literal.
- **The garrison** stands at the post (`GARRISON_STANDS`), with the same ids,
  names and kinds, and each faces the way he watches. Casso tells of the camp and
  ties it to the raid: the goblins do not use the bridge, they wade the Tessen at
  its mouth and go down the shore to Tidehaven, and the sacks in the camp are
  Tidehaven's (the camp's props were always "Stolen Tidehaven supplies" in
  Tidehaven cloth). The Captain's orders are the bridge; with a third sword he can
  leave it. The march, the follow logic and the allied fight are as before; the
  one change in `src/main.js` is that allies are clamped into the arena along
  whichever axis it runs. The reward is still thirty copper, from the post's chest.
- **Availability** stays at quest stage 10, and that is now the natural rule rather
  than a gate: stage 10 is reached at the Caloss Gate, and the road north leaves
  the main road 38 m beyond it, so the quest is offered as soon as the traveler can
  reach the post by road. An earlier opening would only matter to someone who cut
  through the forest before the tutorial ends, and the fight is north of the
  river, so nothing attacks the traveler in Drent either way.
- **Tidehaven points north** in two lines, no new stages: Tobin, after the raid
  (the raiders came over the Tessen and wade its mouth; the Legion keeps a post at
  the bridge), and Eren, from stage 8 (the post has been counting them; the road
  leaves ours past the Caloss Gate).
- **Luscia keeps no trace.** The three `garrison-*` stands are gone from Lumber
  Town's square, the camp's clearing and trail from north Luscia's scatter, and the
  camp trail from Luscia's chart (the chart test now asserts its absence and its
  presence on Pueth's). `src/luscia-town.js` and `src/luscia-chapter.js` never
  mentioned the camp or the garrison, so nothing in them changed. The
  `goblin-camp` cluster stays in `src/world-scale.js`, its note rewritten: it holds
  no place now, but it keeps 56 m checkpoints taken on that ground resuming exactly
  where they were taken.
- **Old saves.** Quest snapshots hold no positions, so a checkpoint with the camp
  scouted, accepted or cleared loads unchanged: cleared stays cleared and paid (a
  second `turnIn` is refused), and an accepted camp's destination is the landmark
  now in Pueth. A position saved in the old camp ground is a position in Luscia's
  woods (and `main.js` already falls back to a region spawn if a tree has grown
  there). `tests/pueth-world.test.js` saves and reloads all three through
  `road-checkpoint.js`, one of them a 56 m save.

## Registries and shared files

`PLAYABLE_REGIONS`, `REGION_BIOMES`, `REGION_IDS` (Pueth is 5; `REGION_NAME_BY_ID`
is derived), `REGION_TERRAIN`, `REGION_TEXT`. Everything else follows from the
survey: membership, outline and softened border, `WORLD_BOUNDS` (z −349 → −608),
the minimap, the trail charts (the chart region list is derived), the region card
and autosave on entry. Code and tests that counted four regions now derive from
`PLAYABLE_REGIONS` (developer atlas destinations and their inset, the developer
and local-map smokes, `tests/regions-world.test.js`,
`tests/developer-atlas.test.js`, `tests/local-map-data.test.js`). The developer
atlas gains a Pueth local destination and ghost-travel point; its Cape Thalmagar
pin is found by id rather than by index. `world.js` edits are anchored and small:
imports, the deck list, one call to `createPuethScenery`, the Pueth road and camp
side trail in `paths` (after the existing paths, so `paths[0]` is still the main
road), the fine terrain band extended north over the bridge and post, chart
waters, landmarks, people, the fishing bank. `world-regions.js`: the clearings
and the `ownScatter` skip. The road traversal smoke walks the road north as a
branch.

## Files touched

New: `src/pueth-world.js`, `src/pueth-scenery.js`, `src/pueth-people.js`,
`src/region-rivers.js` (generated), `scripts/build-region-rivers.mjs`,
`tests/pueth-world.test.js`, `docs/pueth-report.md`.

Changed: `scripts/build-region-survey.mjs`, `src/region-survey.js` (regenerated),
`src/region-layout.js`, `src/region-world.js`, `src/world-terrain.js`,
`src/world-regions.js`, `src/world.js`, `src/world-scale.js` (a note),
`src/forest-hideout.js`, `src/forest-hideout-watch.js`, `src/forest-hideout-smoke.js`
(rewritten), `src/road-checkpoint.js` (a message), `src/main.js`, `src/developer-atlas.js`,
`src/developer-mode.js`, `src/developer-smoke.js`, `src/local-map-smoke.js`,
`src/road-traversal.js`, `src/road-smoke.js`, `package.json`, and the tests
`developer-atlas`, `forest-hideout`, `forest-hideout-world`, `local-map-data`,
`regions-world`, `story-stands`, `world-scale`.

`src/main.js` (CRLF, patched by exact anchors): one import and one push of
Rimeholt's people, one conversation hook, the axis-aware ally clamp, the camp
task's region check (derived from the camp, no longer `=== 2`), the side-quest
HUD lines, the stores prompt, the test/review hideout positions, `prepareHideout`
starting the journey at stage 10 (a stage-10 checkpoint must have it started),
the review's stale Tamsin view now showing the Captain, and the two Tidehaven lines.

## Tests and smokes

`npm test`: **401 tests, 401 pass**. New in `tests/pueth-world.test.js` (in the
`package.json` list): the region against the atlas and colder than Drent; the
rivers against the map's edges and nowhere else, including the mouth reach and the
Tidehaven reach constant; the road north ridden metre by metre at `RIDE.radius`
end to end, the bridge crossed both ways on foot and mounted, rails with no ledge,
and no ford anywhere else on either river; the junction, the barrier and the
bends; every Pueth stand standable, reachable from the road by a flood fill, 4 m
from every other person and quest point; the camp's fight valid under
`combat.startEncounter`, alone and with the garrison, its retreat open and toward
the road, all of it north of the river; old saves; and the generated rivers file
against the map.

Run in this order, once each. `test:game` was run a second time because its
first run stopped on a fault that predates this branch, before it reached most of
the story.

| Smoke | Result | What it found |
| --- | --- | --- |
| `npm run test:game` | first run failed; after the fix, **pass** (`smoke.json` `ok: true`, 30 ms average frame, 476 draw calls) | The story smoke's quest-HUD check did not know the ostler's banner ("What the Legion owes"), which the riding merge put on the HUD once Iven pays with the horse token; it failed at `return-courier-satchel`. Not Pueth's doing. `src/road-smoke.js` now counts `OSTLER_OBJECTIVE.title` as the quest having moved on. |
| `npm run test:hideout` | **pass** (`hideout-smoke.json` `ok: true`), 2 023 assertions, 25 more on reload | The rewritten flow ran end to end: the Captain sends you to Casso, Casso's account marks the camp, the Captain marches, the garrison follows along 271 m of trail, the fight starts with **3 allies**, falling back south ends it and keeps the errand, a deliberate defeat and Retry, a win in 6 swings, the stores lifted once, 30 copper paid once, the journal, 5 autosaves that never moved the main quest, and all of it restored in a fresh renderer. One finding, recorded rather than fixed: after falling back from the allied fight, pressing F for the Captain did not open his conversation within about ten seconds (the report field `standDownByConversation` is `false`), so the smoke stood the men down through the quest action. The same regrouping simulated in Node puts the Captain 2.9 m from the traveler, inside the 3.3 m talk range, so the likeliest cause is the soldiers being left somewhere awkward when the combat view hands them back; worth a look by whoever next touches the escort. |
| `npm run test:road` | **pass** (`road-traversal.json` `ok: true`) | Nothing. The traversal now walks the road north as a branch: out over the Tessen bridge to the Feradom barrier and back, then the whole main road and the Suval branch as before, 9 190 m in 1 289 s, every region entered on foot, the frontier rope holding. |

## Frame time

The traversal smoke's mean wall-clock frame per region. The published figures
in `docs/world-scale-report.md` were taken on a different day and before the
riding merge, so the base commit (`e11dcb0`) was run again today, on the same
machine, just before measuring the branch.

| Region | Base `e11dcb0` today | With Pueth | Change |
| --- | --- | --- | --- |
| Drent | 28.0 ms | 29.2 ms | +4 % |
| Luscia | 25.9 ms | 26.7 ms | +3 % |
| East Suval | 23.5 ms | 23.9 ms | +2 % |
| Moros Plain | 25.7 ms | 25.9 ms | +1 % |
| Pueth | | 25.0 ms | new |

Well inside the brief's 15 %. Drent's sample now also covers the Drent stretch of
the road north, walked out and back (2 007 m walked in Drent, against 906 m).

Built world (Node, `createWorld`), base / Pueth: colliders 5 951 / 7 745 (Pueth's
trees, 667 water blockers on its two rivers, palisades and rails); terrain
vertices 122 512 / 151 125 (the world grew 259 m north, and the fine 2.5 m band
reaches north over the bridge and post); world build 1.7 s / 2.8 s. Pueth's own
scatter: 751 trees (430 birch, 284 fir), 653 rocks, 1 720 tufts, 69 instanced
batches. Geometry submitted from a camera on the road looking west, plus its
shadow pass (draws / triangles), base → Pueth: Tidehaven 514 / 852 k → 552 /
926 k; Drent road 349 / 653 k → 356 / 663 k; the same spot looking north, toward
Pueth, 237 / 581 k → 347 / 696 k; Avrel clearing 320 / 477 k → 326 / 503 k; Caloss
crossing 226 / 320 k → 223 / 339 k; the Lauvel 229 / 220 k → 220 / 211 k; Lumber
Town 211 / 184 k → 210 / 187 k; the Moros 66 / 77 k → 71 / 87 k; East Suval
252 / 211 k → 248 / 211 k.

## Left as stubs

- No rebel quest and no hill-goblin quest: the east is the Cold Hearth and
  rumour; the hill goblins are the trapper's word. `campaign-world.js` already
  records both for Pueth's Empire and Coalition arcs.
- Rimeholt is a first version: no inn interior, no market, no quest giver, no
  timber-road network to the coast; its people have ambient lines only.
- The Feradom road stops at a closed Legion barrier with a rope line; the world's
  northern bound is 60 m beyond Pueth's border.
- No fishing on the Ordel; no boats at Birch Landing.
- Drent's two small internal rivers on the map are not built (above).
- The camp's goblins are still bramble scouts; nothing in Pueth attacks on the
  road, since the brief asked for no new threat beyond the camp.
- The README's district table and region blurbs, and `CLAUDE.md`'s "four
  playable regions", still describe four regions.

## For the lead, on merge

- **Regenerate `src/region-survey.js`** once both this branch and West Suval are
  in: both add a name to `PLAYABLE` in `scripts/build-region-survey.mjs`
  (`node scripts/build-region-survey.mjs`; `tests/region-survey.test.js` catches a
  stale file).
- **Region ids.** Pueth took id 5 in `REGION_IDS`; West Suval will want its own.
  Nothing in this branch assumes Pueth is 5 except that entry.
- **Signs.** Two labels (`The Tessen Bridge`, `Rimeholt`) were appended to
  `roadSignLabels` in `world.js`; the atlas holds 27 rows and now uses 25. The
  signs agent's restyle should pick up `PUETH_SIGNS` in `src/pueth-world.js`.
- **Shared lines likely to conflict:** `PLAYABLE_REGIONS`, `PLAYABLE`, `REGION_IDS`,
  `REGION_TERRAIN`, `REGION_TEXT`, `REGION_BIOMES`, the developer atlas's
  `LOCALS`, and `main.js`'s npc push. Each is a one-entry addition.
- **`src/region-rivers.js`** is generated: if the World Builder map's rivers
  change, run `node scripts/build-region-rivers.mjs` (to add another region's map
  rivers, add it to `RIVER_REGIONS` there).
- **`test:autoplay`** was not run, as instructed. A rendered autoplay run would
  need nothing from Pueth (the autopilot follows `paths[0]`, still the main road,
  and Pueth is optional), but its known Caloss driftwood stall and the chapters
  past the Legion camp are as the scale report left them. The autopilot's unit
  tests stay green.
