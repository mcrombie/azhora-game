# Region rebuild: Drent, Luscia, Moros Plain, East Suval

The playable world is rebuilt so that each region's shape, size and position match the atlas, the four regions are the four the story needs next, and the minimap, compass and chart all agree about north. This document is the plan and the brief for whoever builds it. The scaffold it relies on is `src/region-layout.js` (tests in `tests/region-layout.test.js`).

## What changes and what stays

Today the world is one straight road along -Z: Eastreena (forest coast), Sunmeadow Plain (fields), Reedwater Crossing (river), Threefold Rise (stone). It is about 700 m long and 190 m wide, hand-placed in `src/world.js` with coordinates repeated in `regions.js`, `local-map-data.js`, `minimap.js`, `road-checkpoint.js` (`WORLD_BOUNDS`), the smokes and the tests.

After the rebuild:

| Region | Shape and size | Biome | Keeps from today |
| --- | --- | --- | --- |
| **Drent** | The authored Drent hexes at `METRES_PER_HEX` (56 m per hex): about 500 m wide, 300 m deep, on the north-east coast. | All green forest (`REGION_BIOMES.Drent`): dense broadleaf canopy, ferns, deer, the village and one farm clearing cut out of it. | Tidehaven village and landing, the Greenway tutorial (Mara, Eren, straw post, bell, goblin ambush), Willowmere Pond, the six woodland places, Tamsin, Lysa, Orris, Bran, the scout camp. Move them as a unit; do not redesign them. Sunmeadow's farm becomes the forest's farm clearing; Corvan's post and the cart stand there. |
| **Luscia** | The authored Luscia hexes, south-west of Drent across the **Caloss** (the Drent–Luscia border). | Sparse woodland (`REGION_BIOMES.Luscia`): rolling grass, copses that thin toward the west. | Reedwater Crossing's river and timber bridge become the Caloss crossing on the border. Hollis keeps the crossing. Sava's shrine and the waymarkers sit on the Luscia side. New: the **Lauvel battlefield** (the aftermath scene) at `routeAnchors().lauvelField`, a burned hamlet. |
| **Moros Plain** | The authored Moros Plain hexes, west of Luscia. | Open plain (`REGION_BIOMES['Moros Plain']`): flat, treeless, big sky. | Nothing today. New: the **Legion camp** at `legionCamp`, the road from the `morosGate` border. A horse hitch (riding is a later mechanic). |
| **East Suval** | The authored East Suval hexes, south of Luscia. | Stone hills (`REGION_BIOMES['East Suval']`): the look of today's Threefold Rise (grey rock, heather, waymarkers, ridge rocks, roofless waystation). | Threefold Rise's stone scenery style. New: **Elod's border post** at `suvalBorder` (guarded, neutral), the town of Elod at `elod` in the north-east (a gate and a few buildings are enough for now), hill-bandit country to the south (no encounters yet). |

Region outlines come from `regionOutline(survey, id)`; hex cells with terrain and biome from `regionCells(survey, id)`; the world's extent from `worldBoundsFor(survey)`; story anchors from `routeAnchors(survey)`. The survey is `assets/azhora-dev-regions.json` (load it with `fetch` in the renderer, `readFileSync` in Node; both are already done elsewhere in the project).

## Orientation

`HEX_WORLD_TRANSFORM` puts north up: world -Z is atlas north, +X is east, one hex is 56 m. Tidehaven stays near the origin (world `(0, 29)` is the Drent coast hex `TIDEHAVEN_ATLAS`). With this transform the road from Tidehaven runs **south-west** through Drent's forest to the Caloss, on through Luscia, then **west** to the Moros or **south** to East Suval. The minimap's "N" is true north, the compass needs no offset (`compassHeading(yaw, HEX_WORLD_TRANSFORM)`), and the chart marker is `HEX_WORLD_TRANSFORM.worldToAtlas(x, z)`.

Today's world uses `LEGACY_ROAD_TRANSFORM` (road bearing about 248°) so the compass, the rotated minimap and the chart marker are already truthful. When the rebuild lands, switch `main.js` from `LEGACY_ROAD_TRANSFORM` to `HEX_WORLD_TRANSFORM` in the three places it is imported (compass, minimap `northOffset`, chart marker) and delete the legacy transform's uses.

## Terrain and scenery rules

- Ground height per hex from the biome's `relief` (amplitude, wavelength) with smooth blending across hex centres; the Caloss is a real river bed with a bridge deck (copy the Reedwater approach in `groundHeight`/`heightAt`); the coast at Drent's east edge is a shallow beach like today.
- Trees: `treesPerHex` per biome, placed with a deterministic seed per cell, never on roads, clearings, quest sites, NPC stands or collision-critical spots (`featureClear`). Drent's canopy is dense; Luscia's is copses (cluster trees around 2–3 seeds per cell rather than uniform); the Moros has none; East Suval has a few.
- Rocks: `rocksPerHex`; East Suval gets ridge rocks and stone paths like Threefold Rise.
- Roads: the main road is a polyline through the anchors (`tidehaven → drentHeart → calossCrossing → lauvelField → morosGate → legionCamp` and `lauvelField → suvalBorder → elod`), following the same `paths`/`routeJourney` conventions so the minimap, trail charts and autopilot keep working (the autopilot follows `world.paths[0]`; make that the main road).
- Region membership: `world.regionAt(x, z)` uses `regionAtWorld` (hex outlines), not Z strips. `world.regions` entries carry `id`, `name`, `subtitle`, `palette`, `spawn`, `outline` (polygon), `bounds`, `npcIds`, `landmarks`. Ids: 1 Drent, 2 Luscia, 3 Moros Plain, 4 East Suval.
- Borders: dashed lines on the minimap and trail charts follow the outlines. A region border on the ground is a signpost and a change of scenery, not a wall; the frontier rope stays only where the world ends.

## Story hooks to place (scenery and NPC stands; dialogue can come later)

- Drent: everything the tutorial needs, unchanged in behaviour. Corvan's Legion post in the farm clearing. The Caloss signpost on the south-west road.
- Luscia: Hollis at the Caloss bridge; Sava's shrine and three waymarkers on the road south-west of the bridge; Iven's relay near the Lauvel field; the battlefield (broken carts, banners, a burial line, a Legion picket); a burned hamlet; wolves as scenery only.
- Moros Plain: the Legion camp (palisade, tents, a command tent, a horse line, a Legate stand); a signpost at the Moros gate; the outpost that the border battle is fought over (a stockade near the Suval side).
- East Suval: Elod's border post with a barrier and two guards; Elod's gate; ridge rocks and a roofless waystation; a hill-bandit lookout in the south (empty).

## Acceptance

- `npm test` passes, including `tests/region-layout.test.js`, `regions-world`, `local-map-data`, `minimap`, `trail-map`, `road-checkpoint` (update `WORLD_BOUNDS` from `worldBoundsFor`).
- `npm run test:game`, `test:road` (rewrite its route to the new main road), `test:checkpoints`, `test:local-map`, `test:autoplay` pass. The autopilot must still complete the road: keep the quest stages' trigger positions consistent with the new anchors (`world.northTrail` and `world.border` become the last Drent rest and the Caloss gate).
- Old saves either restore (positions inside the new bounds) or are rejected with the existing "outside the playable road" message; do not crash.
- The developer atlas's four local destinations point at Drent and Luscia, and the chart marker follows the traveler.
- README's district table and the region descriptions are rewritten for the four regions.

## Suggested order

1. Add the survey load and `HEX_WORLD_TRANSFORM` plumbing to `world.js`; generate ground and outlines for the four regions with placeholder scenery; move the village as a unit; get `npm test` and `test:game` green with the tutorial working.
2. Roads, the Caloss bridge, Luscia's rest and relay, waymarkers; the journey quests re-anchored; `test:road`, `test:checkpoints`, `test:autoplay` green.
3. Biome scenery density and the new hooks (battlefield, Legion camp, border post, Elod).
4. Switch the orientation transform, README, docs.
