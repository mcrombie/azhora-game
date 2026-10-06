# Feradom and Ambron farmland

The open country now has ten small agricultural places: seven spread across more
than 800 metres of Feradom's seaward plain, and three on the first dry land south
of Ambron. They are fields, not invented villages. No residents, personal names,
houses, quests, or hats are added.

## Landscape design

Feradom's western shoulder and coastal end carry low orchards and hay grass. The
gentler middle plain has barley strips and vegetable patches, with the strongest
cultivation near the existing routes. Ambron's gardens form a loose productive
edge outside its walls, leaving the gates, lake shores, and eastern quest road
open. The fields do not flatten the country or encroach on the fortified passes.

Each place combines three irregular closes rather than one rectangular enclosure.
Different crop arrangements, contour directions, broken hedges, occasional short
rail fragments, pale harvested grass, and varied orchard crowns make the ten
places related without being identical. Grain stands have slender stems and
ears; vegetable strips have visible leaves and roots. The warm ochres and muted
greens use the existing faceted, untextured art style.

Footpaths enter through open gaps and join an existing city road or pass floor.
The remote coastal orchard joins its neighbouring farm instead of gaining a new
major road. These are narrow, lightly worn dirt lanes. They do not bypass the
military hill crossings. Every lane was sampled for land ownership, water
clearance, and a walking grade below 0.7.

The modest open timber shelters contain tools and a crate, not a residential
interior. Seed benches, tied seed sacks and water tubs sit beside the working
gardens. Mailboxes are reserved for assigned character homes; these structures
are unassigned outbuildings.

## Playable farming

`src/world/scenery/regional-farmland.js` owns immutable coordinates and stable save IDs. It has
no renderer or terrain dependencies, so terrain generation and the farming model
can both read it safely.

- `FARMSTEADS`: ten layouts, each with fields, a boundary, orchard trees, a shelter,
  a seed station, an approach, and two to four row objects.
- `REGIONAL_FARM_ROWS`: thirty playable 2.8 by 3.1 metre beds using the existing
  farming loop. The combined farming model and its save/restore own their states.
- `REGIONAL_SEED_STATIONS`: one supply location per farm.
- `FARM_LANES`: explicit narrow access paths, joined to a farm approach at one end
  and an existing route or another farm at the other.
- `regionalFarmlandClear`: reserves the farm footprints and lanes from incidental
  trees, rocks, and undergrowth before that scenery is generated.
- `regionalFarmlandWorked` and `FARMLAND_WILDLIFE_EXCLUSIONS`: keep wildlife homes
  and movement out of crops, gardens and shelters while allowing meadow margins.

Only established crop identifiers are used: `barley`, `carrot`, and `beet`. The
larger planted field strips provide the agricultural setting; the thirty marked
beds are the interactive plots. Their crop state is drawn by `farming-view.js`,
so static scenery cannot overwrite a player's planted or harvested bed.

## Geometry and integration

`createRegionalFarmlandScenery({ root, groundHeight, colliders, canPlace? })` in
`src/world/scenery/regional-farmland-scenery.js` returns `{ group, metrics }`. The optional
`canPlace(point, kind)` hook lets a caller suppress an entire farm or individual
field/crop/tree/hedge if future terrain requires it. It does not invent alternate
positions or move roads.

Irregular ground polygons are triangulated and subdivided to at most about
2.5 metres before each vertex samples the real ground. Dirt lanes, furrows, crop
feet, hedge bases and orchard roots also sample the terrain. Grain rows run
across the slope and bow gently, rather than marching straight downhill.
Shelter posts start at their separate ground heights below a level roof.

The scenery is batched per farm into ground, crops, and props: 30 meshes total,
about 397,000 vertices at the authored density. Ground and tiny crops do not cast
individual shadows. There are no per-frame scenery updates or new texture files.
Only solid props receive colliders; the tool shelter remains open at the front,
and the seed bench has a clear standing place beside it.

## Verification

`tests/regional-farmland.test.js` checks dry ground and region membership,
gentle playable beds, city-wall and road clearance, military-yard avoidance,
connected walkable lanes, wildlife exclusions, terrain-conforming geometry,
bounded rendering cost, and access to every bed and seed bench in the combined
world. Native playtesting is handled by the root countryside integration pass.

The native countryside run passed 88 assertions, including collecting seeds,
sowing, watering, gaining Farming XP, saving/reloading and harvesting at both
a Feradom farm and an Ambron farm. Combined-world geometry checks verified
access to all 30 beds and all ten seed benches. Overhead desktop captures are
`tests/artifacts/countryside-feradom-farmland.png` and
`tests/artifacts/countryside-ambron-farmland.png`.
