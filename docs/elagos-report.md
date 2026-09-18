# Elagos and Ambron: what was built

The build report for `docs/elagos-brief.md`, on branch `elagos`. Elagos, the
Lake Lands, is the eighth playable region. Its lakes are real water cut into
real ground; Ambron, the walled city of the empire, is built **across** the
narrows where Lake Ela goes south, so every barge on the lake system passes
under its chain; and the road up from the Moros arrives at its Plain Gate.
Chapter 3 is not built: nobody here moves a quest.

The day on the ground is the one `docs/the-war-and-the-house-of-ambron.md`
fixes: the traveler arrives one day after the revolution, with Cedric gone,
Willard a king on a leash, and the news that Valroy has landed in the east.
Nothing in the city has stopped. The chain went up at dawn.

## What the lore gave, and what I invented

**From the lore** (`geography/regions/elagos.md`, `peoples/the_elagosi.md`,
`campaign-world.js`, `campaign-design.md`), built as ground:

| The lore says | On the ground |
| --- | --- |
| Lake Ela, the great lake, at the centre of the drainage | The largest basin, filling the atlas's two joined lake hexes (0,107) and (0,108) |
| Lake Brul north-east, cold and stormy; the Thelas chain, three basins in the west, draining to Ela by **the Link**; Lake Ossen, shallow and warm | A basin on each of the other three atlas lake hexes; the Thelas as three joined basins; the Link as a small falling river into Ela |
| Ambron holds the narrows where Ela's outflow pinches before dropping to the plain | The outlet pinches to 46 m and runs due south straight through the city |
| Every barge, raft and load of fish passes the narrows; **toll income is the empire** | The chain in the south water gate, the capstan house, the tally board, the Toll House over them, the queue of laden barges above the chain and one paid barge below it; the toll board over the Plain Gate; the whole city's dialogue |
| "A Tenochtitlan on cold northern water" … "walled, causewayed" (`campaign-design.md`, `SETTLEMENTS.ambron`) | Walls built across the water; a seven-arched causeway carrying the main street from bank to bank |
| No single architectural period: old lake-stone in the foundations, high imperial work, contraction repairs, recoveries | Four masonries chosen by where a stone stands; four pavings; roofs by age; the drowned causeway of an older Ambron; a suburb outside the walls kept, roofless and re-roofed |
| Population rises and falls with the empire's reach | The Outside: eight houses along the haul road, three roofless, two re-roofed |
| Lake-effect snow closes roads; ice-roads open in their place; winters are planned for | The Ice-Road Stone and its warden's hut and stakes, the ice warden in the city, sledge runners stacked against the granary, steep roofs, the lake gauge on the quay |
| The Ela-south, navigable to the Moros grain towns | The reach below the city falls over **the Stair** and runs on, off the west edge of the world |
| Ossen's granary architecture persists through contractions | The Lake Granary, a stone drum under a conical roof |
| Elagosi is its own language; records at the narrows are kept in it | The Record House, the scrivener, the printer re-setting a proclamation in Elagosi and Mittoli |
| The lake communities regard Ambron as weather | Nemmel's net-maker and the Brul fisher, word for word |

**Invented, in the lore's voice** (the lore is silent on all of it):

- **The Stair.** The lore says the outflow "drops toward the plain". I made the
  drop a stepped fall below the city, where the shelf ends, with an ox capstan
  that hauls laden barges up it. It is also why the toll can be taken here: the
  water makes everything stop.
- **The layout of the city**: the channel through the middle; four land gates
  (Plain, Lake, Ossen, Raft) and two water gates; the causeway; the east bank as
  the old high city and the west bank as the timber strand, a metre and a half
  lower, where Thelas rafts are broken up.
- **Named places**: Nemmel (the fishing hamlet on Ela), the Ice-Road Stone, the
  Lake Shrine, the Drowned Causeway, the Link Crossing, the Physic Garden, the
  House of the Lake (the temple), the Record House, the Chain and Sledge (the
  inn), the Legate-General's Seat, the Barge Quay, the Timber Strand, the Outside.
- **Every person's name.** Elagosi names are given their own sound (double
  consonants, -enn/-ull/-os) so they read apart from the Legion's Latinate names
  and from Mittoli: Sabbis Orenn, Neira Sarn, Duvo Harn, Kess Vollo, Mella Drusk.
- **Legate-General Duvo Harn**, who declared for the constitutional monarchy at
  dawn the day before "rather than see the city burn" and holds the narrows for
  Willard with the same soldiers — the lore's "the machine does not stop".

**Where the atlas and the lore disagree**, I followed the atlas for the shape
and the lore for the name: the atlas has no lake in Elagos's south-east, so
**Lake Ossen** is the lake hex due east of Ela rather than south-east of it; and
the Thelas hex lies north-east of Ela, not west, so the Link runs south-west into
Ela's north shore.

## The region

- `PLAYABLE_REGIONS` gains `'Elagos'` (**id 8**), biome `lake-shelf`: rolling
  green with dense-grained broadleaf in stands, no conifers (`world-regions.js`'s
  pine rule now names two biomes), rocks from the ice, bigger scatter blocks
  (`blockHexes: 6`, a new optional biome field; see Performance).
- `REGION_TERRAIN.Elagos`: base **19.8 m**, amplitude 2.6 on a 165 m wave; its
  atlas `forest` hexes stand a little higher and its `lake` hexes a little lower.
  It is the highest ground in the playable world (the test checks it against all
  seven others), which is the lore's "northern shelf": everything falls away from
  it, to the Moros by about 11 m across the southern border.
- Region card (`REGION_TEXT`): "The Lake Lands and Ambron"; spawn on the haul road
  below the Plain Gate.
- `scripts/build-region-survey.mjs` lists Elagos; `src/region-survey.js` is
  regenerated. **The hex window did not need to grow** (Elagos is q −2…6, r 102…110).
- `WORLD_BOUNDS.minX` moves **−1460 → −1610 (150 m west)**. The other three edges
  are unchanged.
- The atlas facts are tested: 43 hexes (32 grassland, 6 forest, 5 lake), north of
  the Moros, west of Drent.

## The water

`src/elagos-world.js`, pure. Water is described two ways:

- A **basin** is a shore with one level: an ellipse about the atlas lake hex,
  turned and given a fixed wobble so no lake is a drawn oval. Ela 14.6 m, Brul
  16.4 m, Ossen 16.0 m, the three Thelas basins 16.8 m.
- A **reach** is a course with a half width and a surface at every vertex: the
  Ela-south (14.6 m through the city, 13.3 → 9.2 m over the Stair, 3.9 m where it
  leaves the world) and the Link (16.8 → 14.6 m).

Both are rasterised **once** into a signed distance field (4 m cells, two
chamfer sweeps like the coastline in `region-world.js`) that carries the water's
own level outward. `elagosGround(x, z, natural)` answers any point in one
bilinear sample:

- under water the bed falls to **0.2 m**, below `canStand`'s footing, within 5 m
  of the shore, so a lake is water and not shallows, and the opaque surface hides
  the drop;
- outside, a bank rises from the waterline, and where the land stands high above
  the water the cut widens with the depth of it (as Pueth's rivers do), so the
  Ela-south runs through a valley below the Stair rather than a slot;
- inside Ambron's made ground the bank is a quay, not a slope: the terrace stands
  to the water's edge.

`world-terrain.js`'s `groundWithRiver` ends with one call to it; points outside
the field's box return at once. A band of collider circles just inside every
shore keeps feet dry, left open only on the causeway's lane and the Link
crossing, whose parapets close the strip beside each deck.

The water is drawn with one cold northern shader, six meshes (Ela, Brul, Ossen,
the Thelas chain as one, the Ela-south, the Link).

## Ambron

`src/ambron.js` (pure: the plan) and `src/elagos-scenery.js` (the scenery).
The city is in its own frame, square to the world: `ambronPoint(a, b)` is `a`
metres east and `b` metres south of the middle of the causeway, at world
**(−1274, 286)**.

### Fortification

Laid out by `fortCircuit` from `src/fortification.js` — the shared standard's
own plan and colliders — at a capital's measures (`AMBRON_STANDARD`):

| Measure | Ambron | Solis |
| --- | --- | --- |
| Circuit | Closed rectangle **184 × 136 m, 640 m** | 100 × 84 m, 368 m |
| Wall | 7.2 m, walk at 5.0 m, 4.6 m thick | 5.0 m, walk at 4.2 m, 2.4 m |
| Towers | **26**, 10.2 m platforms, steep lake-country caps; longest curtain run between towers 36 m (the two 52 m gaps are the water gates) | 11 |
| Gates | **Four land gates** (Plain, Lake, Ossen, Raft), 5.2 m, two towers each, leaves drawn back, toll boards over the Plain and Lake gates; **two water gates**, 46 m, open to the sky between great towers | 2 |
| Ditch | 5 m, outside every land face, stopped wherever it would stand in the lake | 3.5 m |

The walls are drawn by my own code in Ambron's four masonries rather than by
`fortworks.drawCircuit`, because the look is the point; the plan and colliders
are the standard's.

### The layers

`masonryAt(a, b)` picks the stone by where it stands:

- **lake-stone** (grey-green, the first settlement) wherever the circuit meets
  the water, the quay faces, the causeway's piers, the chain house, the House of
  the Lake — and the footing course of *every* wall and building in the city;
- **imperial ashlar** (pale, fine) on the north-east: the Seat, the Record House,
  the gates;
- **patched rubble** (brown-grey) on the west bank and the west wall;
- **new coursed work** (bright) in the south-east, rebuilt within living memory.

The paving follows (`street.layer`: lake-stone on the quay and the market,
imperial on the main streets, patched on the strand, new on the upper lane), and
so do the roofs: turf-grey slate by the water, the empire's dark tile, shingle and
thatch from the thin years, pale new slate. The **Drowned Causeway** — eleven
stumps of an older crossing standing out of the water below the south wall — and
the **Outside** along the haul road are the city's history on the ground.

### The toll

The **chain** hangs in the south water gate as a catenary of 24 links just clear
of the water, made fast to eyes in the two chain towers. The **capstan house**
stands on the east quay beside it with the capstan and its bars and a **tally
board**; the **Toll House** overlooks both, with a great board of the rates and
the new proclamation nailed over the old notices. Five laden **barges** (grain,
fish, timber, barrels) wait two abreast along the Barge Quay, two more against
the timber strand, and one that has paid lies below the chain waiting for the
Stair. The Plain Gate's arch carries the rates board every load passes under.

### The streets, the quays and the buildings

- **21 buildings** inside the walls and **8** in the Outside (Solis has 19): the
  Legate-General's Seat (a seven-column colonnade, the standard and the empty
  bracket where the last one was taken down), the Toll House, the Capstan House,
  the Record House, the House of the Lake, the Lake Granary, the Chain and Sledge,
  warehouses, the Raft Shed, the Salt House, the Ropewalk, the Lake Boatyard, the
  strand rows.
- **Nine streets**, the widened **market of the narrows** on the main street
  (seven stalls and a covered well), the **Physic Garden** (below), and the two
  **quays**: paved aprons with a lake-stone face down past the waterline, water
  steps, bollards and six jib cranes.
- The **causeway**: five lake-stone piers with cutwaters, seven arches, a level
  deck 3.1 m above the water between them and ramps to each bank; `world.heightAt`
  asks `ambronDeckHeight`, so the deck is walkable and the water beside it is not.
- **Winter** on the ground: the lake gauge on the quay, the sledges against the
  granary, the ice warden at the Lake Gate, steep roofs everywhere.

## The people

`src/ambron-people.js`. **32 people**: 30 in the city, two in the lake country.
Ambient lines only, in the shape `peblos-people.js` uses, with a leave choice.

- *The toll*: Sabbis Orenn, Clerk of the Chain; Dreo the tally boy; Orrec Damm
  the chainman; Kess Vollo, a bargemaster forty-first in the line; Mella Drusk of
  a Brul boat.
- *The empire's own* (the only people in Legion armour, all men): Legate-General
  Duvo Harn; his optio; the optio and a legionary on the Plain Gate; the Lake Gate
  guard; a legionary on the causeway. Luso Marren, scrivener of the Record House,
  is not armoured.
- *One day of revolution*: Neira Sarn of the King's Council ("Not emperor.
  King."); Vetch Ollim, re-printing the proclamation because "empire" was taken out
  of the second line.
- *The market and the lake country*: a fish seller, a grain factor, a barley
  farmer and his sister from the Ossen shore, a deep-water fisher of Brul, the
  warden of the ice-roads.
- *The timber strand*: a Thelas raftsman, a sawyer, a ropemaker.
- *The ones the toll does not reach*: Old Ketto on the water steps; Sennet Ollo of
  the strand rows, whose husband hauled on the Stair capstan.
- *The country*: Thessa Ollan, net-maker of Nemmel; Bolm Harrick, ganger of the
  Stair.

The seam is what the toll does to the people who pay it, from both ends: the
clerk who wrote yesterday's entries under Cedric and today's under the
King-in-Council in the same hand; the bargemaster who minds the waiting and not
the number; the beggar who has never seen a copper go the other way; the widow
who does not want the toll gone, only noticed. "King or emperor" is always a
declaration (the council says king with a point; the Brul woman says "the ones who
say emperor want something from you"). Every stand has footing and is reachable
from the haul road by flood fill.

## The specialists, and the talking tree

Added mid-build at the user's request. **Ambron keeps a specialist for every
skill the country teaches**, as city people rather than copies of the village
ones:

| Skill | Ambron | Where |
| --- | --- | --- |
| birding | Ottilie Sarn, keeper of the tower birds | by the Record House |
| fishing | Rhue Bassel, master of the fish quay | the Barge Quay |
| mycology | Gannet Ivo, mushroom seller | the market |
| botany | **Sennaia Orm, botanist of the Physic Garden** | the Physic Garden |
| geology | Marek Dunn, stone-cutter and quarry assessor | the timber strand; his specimen wall is in the garden |

The **Physic Garden** is a walled court off Ela Street between the Seat and the
granary: six labelled beds, three trees, a pigeon loft over the east wall, and a
specimen wall of one squared block of every stone Ambron has built with, in the
four masonries, in the order they came into the city.

Each specialist has lines for a stranger, a lesson, and something else for a
traveler who already knows the skill; a skill is never offered twice. Teaching
goes through the host: birding through `birding.meet()` (the real module on this
branch), the other four through `context.teachSkill(id)`, which `main.js` wires
to `skills.learn(id)`.

**On this branch only `birding` exists in `src/skills.js`.** `fishing`,
`mycology`, `botany` and `geology` are being built on `main`; until they are
merged, `skills.learn('mycology')` returns `{ ok: false }`, so those four
specialists give their lesson and teach nothing. When the lead's modules land,
they start teaching with no change here — provided the ids are exactly `fishing`,
`mycology`, `botany` and `geology`.

**The talking tree.** The botanist has a branch, "Is there anything you cannot
name?": the sheets record three talking trees and one reply, in a hand that
stopped halfway through a word; they went the way the old woods went; the last one
anybody has stood in front of is in Drent's old forest, older than the city's wall;
it looks at you, and after a while the face is not there any more; stand where it
can see you and do not hurry; what you say, and how, "is not something anybody has
been able to put on paper. You will know it when the tree does." Asked again, she
says something shorter.

The flag is **`talking-tree-told`** (exported as `TALKING_TREE_QUEST` from
`src/ambron-people.js`). The conversation calls `act('talking-tree-told')`;
`main.js`'s new `elagosAct` keeps it in a small `elagosFlags` set, toasts once and
saves. **That set is not in the save yet** — see the merge list.

## The lake country

Four places with discovery text, and more landmarks:

- **Nemmel**, a fishing hamlet on Ela's eastern shore: six houses and a smoke
  shed, drying frames on the beach placed wherever there is room between the road
  and the water, four boats hauled up on the shingle, the net-maker.
- **The Ice-Road Stone**, limewashed and cut with the thickness marks, at the
  water; the warden's hut and the autumn's stakes behind it.
- **The Lake Shrine**, a niche of lake-stone at the waterline with a bowl of small
  offerings.
- **The Drowned Causeway**, eleven stumps in the river below the south wall.
- Also: **the Stair** (four shelved steps of white water, the ox capstan, haul
  bollards, the ganger), **the Link** and its three-slab crossing, the Physic
  Garden, Lake Ela, Lake Brul, Lake Ossen — **14 landmarks** in all.
- Terrain and scatter everywhere else; ~520 reeds, shore willows and boulders
  along the lake edges; eight Outside houses along the haul road.

## Roads, and the way in

- **The haul road** (`AMBRON_ROAD`, 271 m): leaves the Moros road at
  **(−1258, 605.4)**, 128 m east of the frontier barrier, and climbs the east bank
  of the Ela-south past the Stair to the Plain Gate. Signposts at the junction
  ("Ambron" / "The Legion Camp"), halfway, and at the Stair.
- **The lake road** (310 m): out of the Lake Gate, north along Ela's east shore
  through Nemmel, past the Ice-Road Stone, over the Link, to the shrine.
- Two short tracks: east from the Ossen Gate (96 m), west from the Raft Gate (66 m).
- All four are drawn and measured in `world.js`; the haul road is exposed as
  `world.elagosRoute`, the lake road as `world.lakeRoute`. A rider can take both
  end to end (tested at `RIDE.radius`).
- **Getting there is the lead's**: the junction is on the built main road, so the
  traveler can walk up from the Moros today. Chapter 3's journey is not built.
- **Developer travel**: an `elagos` point in `developer-mode.js`, an Elagos entry
  in `developer-atlas.js`'s local route (atlas anchor hex (0,108)), and a testing
  panel button **8 · Elagos · Ambron** that uses the region's spawn.

## Coordinates (world metres)

| | |
| --- | --- |
| Ambron centre (causeway middle) | (−1274, 286) |
| Walls | x −1366…−1182, z 218…354 |
| Plain Gate · Lake Gate | (−1218, 354) · (−1218, 218) |
| Ossen Gate · Raft Gate | (−1182, 280) · (−1366, 308) |
| North and south water gates | (−1274, 218) · (−1274, 354) |
| Terrace (`AMBRON_TERRACE`) | level 17.2 m, +0.012 per metre east; over the walls + 12 m, feathered 30 m |
| Lake Ela centre, surface | (−1345, 100), 14.6 m |
| Lake Brul · Lake Ossen | (−1000, −144), 16.4 m · (−1000, 29), 16.0 m |
| Thelas basins | (−1284, −88), (−1250, −58), (−1217, −30), 16.8 m |
| Haul road junction | (−1258, 605.4) |
| Nemmel · Ice-Road Stone · Lake Shrine | (−1258, 126) · (−1287, 66) · (−1338, 12) |
| Drowned Causeway · the Stair | marker (−1246, 378), piers (−1274, 376) · (−1254, 398) |
| Link crossing | (−1272, 15), deck 17.9 m |
| Physic Garden | `ambronPoint(64…86, 34…44)` = x −1210…−1188, z 320…330 |
| Region spawn | (−1221, 386) |

## Charts, journal, build map

- `SUBREGIONS` (`map-fog.js`): six areas — Ambron, the Narrows, Lake Ela, Nemmel,
  the Link, the Stair. They obey the chart's own spacing rule.
- `mapWaters`: all six basins and both reaches.
- `BUILD_STATUS.Elagos`: **early** — "Chapter 3 is not built: nobody here moves a
  quest… No interiors, no market to trade in, no lake fleet, and Brul, Ossen and
  the Thelas chain are water and landmarks only."
- `SIGN_LABELS` gains Ambron, Nemmel, The Stair, The Lake Shrine.

## Files

New: `src/elagos-world.js`, `src/ambron.js`, `src/ambron-people.js`,
`src/elagos-scenery.js`, `tests/elagos-world.test.js`, `tests/ambron.test.js`,
this report.

Changed (all small and local):

| File | Change |
| --- | --- |
| `src/region-layout.js` | `'Elagos'` in `PLAYABLE_REGIONS`; its biome |
| `scripts/build-region-survey.mjs`, `src/region-survey.js` | `'Elagos'` in `PLAYABLE`; regenerated |
| `src/region-world.js` | `REGION_IDS` (8), `REGION_TERRAIN`, `REGION_TEXT`, `AMBRON`, `ambronPoint`, `AMBRON_TERRACE` in `TERRAIN_PADS` |
| `src/world-terrain.js` | one import; `groundWithRiver` ends with `elagosGround` |
| `src/world-regions.js` | `ELAGOS_CLEARINGS`; ground cover asks `kit.waterClear`; an optional `biome.blockHexes`; no pines on the lake shelf |
| `src/world.js` | imports; measure/draw four roads; one scenery call; the Link deck in `bridgeDecks`; the causeway in `heightAt`; `waterClear` in the scatter kit; landmarks, NPC positions, enclosure, chart waters, `elagosRoute`/`lakeRoute`/`elagosMetrics`; the water's clock |
| `src/main.js` | import; register the people; the conversation hook; `elagosAct`; the testing button id |
| `index.html` | one testing button |
| `src/map-fog.js`, `src/build-status.js`, `src/signs.js` | entries |
| `src/developer-atlas.js`, `src/developer-mode.js` | one travel entry each |
| `package.json` | two test files |

## Tests and smokes

- `npm test`: **526 of 526 pass** (checked by the lead after a stray apostrophe in `src/build-status.js` was fixed). New: `tests/elagos-world.test.js` (9) and
  `tests/ambron.test.js` (10): the region against the atlas; every atlas lake hex
  under water and every basin within a hex of its own; the ground cut to the water
  (no flooded bank anywhere within 14 m of a shore, no land standing out of drawn
  water, nothing wadeable); the Ela-south only ever falling, under its banks,
  through both water gates, off the world's edge and never within 40 m of the
  Moros road; the haul road leaving the main road and a rider taking it and the
  lake road end to end; the Link crossing standable and the water beside it not;
  every place walkable-up-to and in Elagos; charts, journal areas and the build
  map; nothing of the scatter in a lake; the fortification measures against Solis;
  the closed circuit sampled every 2 m at three depths, every land gate walked end
  to end with the real movement rule, the water gates impassable; the narrows water
  from wall to wall and the causeway the only way over it, walked bank to bank;
  the chain; the quays walkable and not over the water; every stand with footing
  and reached by flood fill from the haul road; the enclosure's waypoints; no
  building overlapping another, a wall, the channel or a street; four periods of
  paving; the specialists teaching once and the talking-tree branch; the people's
  voice rules.
- `npm run test:game`: **pass** (`smoke.json` `ok: true`, 1 727 frames, 433 draw
  calls, 841 k triangles, no errors). Its 74 ms average frame was taken with my
  headless-Chrome review renders running on the same machine and is not a
  comparison with anything. The story smoke does not go to Elagos.
- `npm run test:road`: **not run** — the session ended before it finished; the lead runs the smokes after merging.
- Not run: `test:autoplay` (as instructed) and the optional smokes.

## Performance

Measured in headless Chrome (SwiftShader) at 1440 × 810 from the same page, on
this branch; draw calls and triangles are the renderer's own count for one frame
**including the shadow pass**. `?hide=ambron` renders the same frame with
Ambron's own scenery turned off (walls, banks, causeway, lake country, water);
`?hide=elagos` also turns off the region's regional scatter. The differences are
what each costs.

| View | Total | **Ambron's own** | Elagos's scatter | Rest of world |
| --- | --- | --- | --- | --- |
| The Plain Gate, from the haul road | 182 / 469 k | **13 / 142 k** | 48 / 102 k | 121 / 226 k |
| The market of the narrows, looking east | 363 / 675 k | **9 / 141 k** | 44 / 89 k | 310 / 445 k |
| Solis: outside the Gate of Sun Horses | 89 / 163 k | | | |
| Solis: the market square | 201 / 261 k | | | |

PERF_EXTRA

**Against the brief's budget.** The city itself — every wall, tower, building,
street, quay, barge and the causeway, plus the lake country's places and all six
water meshes — costs **13 draw calls at its gate and 9 in its market**, against
Solis's 89 for its whole gate view. It is four merged vertex-coloured meshes
(`Ambron walls`, `Ambron, the banks`, `The Ambron causeway`, `The Lake Lands`)
built with `createSceneryBuilder`, one shared flat-shaded material, and the water.
What makes Ambron's *views* dearer than Solis's is everything around it: the
region's own scatter (+44–48), and a camera in the continent rather than on a
coast — the market view looks east toward Drent's forest, and the world without
any of Elagos already costs 310 there. Triangles are Ambron's weak point: ~140 k
of each frame is the city, mostly the shadow pass redrawing the whole 70 k-triangle
city because the sun's shadow box covers it.

**The scatter.** Elagos is the largest playable region (43 hexes). With the
default two-hex blocks and conifers it cost 110 instanced batches in view at the
Plain Gate (206 draws). Two changes brought that to 139 (measured at 760 × 600):
no conifers on the lake shelf (one batch kind fewer per block), and six-hex blocks
for this region only (`blockHexes`, a new optional biome field). Bigger blocks
cull less finely, which costs triangles in the shadow pass, but they win on draw
calls at every view I measured; two-hex blocks cost *more* in the market (387 vs
363).

World build (Node, `createWorld`, median of three, from a `git archive` of
`ab4e030` against this branch, measured with other processes running so read the
ratio, not the seconds): **14.1 s → 15.7 s (+11 %)**; colliders **9 270 → 10 867**
(+1 597, about 1 050 of them the lakes' shore bands); meshes 1 125 → 1 177;
scene triangles 1.33 M → 1.48 M.

Review screenshots were taken of the city from the plain, the Plain Gate, the
chain from below it, the whole city from the south, the causeway, the market,
the timber strand, Lake Ela from the lake road, Nemmel, and the Stair. The
scratch page and its server are deleted.

## Stubbed, or not built

- **Chapter 3.** No quest, no triggers; nobody here advances the campaign.
  The Legate-General, the council and the printer are placed and voiced for it.
- **Four of the five specialists teach nothing yet** on this branch: their
  skills are not in `src/skills.js` here (see above).
- **The talking-tree flag is not saved**: `elagosFlags` is a `Set` in `main.js`.
- **No interiors**, no trade in the market, no lake fleet, no barges that move,
  no weather, no winter. The ice-roads are marked, not drawn on ice.
- **Brul, Ossen and the Thelas chain** are water, shore scatter and a landmark
  each; no roads reach them. The Ossen and Raft tracks end in open country.
- The **water gates** are open to the sky, not arched; the causeway's arches are
  modelled as spandrels over the water, not true arch rings.
- **The Stair** is drawn (shelved rock and foam over a falling surface), not
  modelled as a waterfall; the ox capstan has no oxen.
- The terrain grid is the coarse 7 m band over Elagos, so open lake shores are
  faceted; inside the city the quay walls hide it.
- The autopilot knows Ambron as an enclosure (`world.enclosures`) but has never
  been asked to go there.

## For the lead, on merge

1. **Regenerate `src/region-survey.js`** after merging this and West Izol
   (`node scripts/build-region-survey.mjs`); both add a name to `PLAYABLE`.
2. **Region ids.** This branch takes **8** for Elagos in `REGION_IDS`; if West Izol
   also took 8, one of them moves. `PLAYABLE_REGIONS`, `REGION_TERRAIN`,
   `REGION_TEXT`, `REGION_BIOMES`, `LOCALS` in `developer-atlas.js`, the travel
   points in `developer-mode.js`, `BUILD_STATUS` and `SUBREGIONS` each gain one
   entry per branch. The testing button loop in `main.js` now reads `[2,3,4,8]`.
3. **`WORLD_BOUNDS.minX` is −1610** here. If West Izol moves another edge the two
   compose (the bounds are derived).
4. **`src/world.js`** conflicts, if any, will be at the imports after Peblos's, the
   `measurePath` line, the scenery call before `buildMorosWorks`, the `addPath`
   block after `PUETH_ROAD`, `heightAt` (the causeway), the landmarks/NPC
   positions/enclosures/`mapWaters` lists, and the water clock in `update`.
5. **`src/world-regions.js`**: `cellBlocks(name, biome.blockHexes)`, the
   `waterClear` guard on ground cover and the two-biome pine rule are general;
   keep them if another region wants them.
6. **Skills.** When `fishing`, `mycology`, `botany` and `geology` land in
   `src/skills.js`, Ambron's specialists start teaching with no change, as long as
   those are the ids. If fishing stays in `campcraft.teachFishing()` rather than a
   skill, route `teachSkill('fishing')` there in the one `main.js` line.
7. **The talking tree.** Read `'talking-tree-told'` (`TALKING_TREE_QUEST`); move
   `elagosFlags` into a saved system when the tree is built.
8. **`mergeByColour`** in `west-suval-world.js` and Ambron's use of
   `createSceneryBuilder` are two ways of doing the same thing; Ambron's is cheaper
   (one material, one mesh per district). Worth converging on when Solis is next
   touched.
9. `docs/the-war-and-the-house-of-ambron.md` is on `main` only; this branch read it
   from there and did not copy it.
