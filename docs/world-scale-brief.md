# Brief: scale the playable world up

The user finds the regions too small to feel like regions, Luscia most of all. Make the world bigger while keeping every region's shape, relative size and position true to the atlas (Luscia stays smaller than Drent because it is smaller on the map).

## Target

- One authored hex becomes **100 m** across (`METRES_PER_HEX` 56 → 100, a factor k = 100/56 ≈ 1.786). Everything derived from the hex survey through `HEX_WORLD_TRANSFORM` (region outlines, cells, the Caloss, `routeAnchors`, `worldBoundsFor`, terrain) then grows by itself. Tidehaven's coast hex stays at world (0, 29).
- Drent becomes roughly 950 m by 550 m, Luscia about 450 m across, the main road about 1.7 km.

## How to move the hand-placed things: rigid clusters

Hand-placed content must not be stretched. A town's buildings, a camp's tents and the people standing beside them keep their distances to each other; only the distance **between places** grows.

1. Add a pure module `src/world-scale.js` (no three, no DOM): `AUTHORED_METRES_PER_HEX = 56`, `METRES_PER_HEX = 100`, `WORLD_SCALE = k`, the anchor `(0, 29)`, a list of **cluster centres** in authored (56 m) coordinates, and `toWorld(x, z)`: find the cluster whose centre is nearest within its radius, move that centre with `anchor + k * (centre - anchor)`, and keep the point's offset from the centre unchanged. A point in no cluster scales plainly about the anchor. Also export `toAuthored` (the inverse, cluster-aware) for migrating old saves.
2. Clusters (authored centres; give each a sensible radius): the whole Tidehaven village box (rigid at the anchor, including the Greenway, Willowmere Pond, the woodland places, Fernway Rest and the Caloss Gate as far as the old field gate), the Avrel clearing (-236, 30), the Caloss crossing and Hollis's camp (-345, 93), the reedcutters' landing (-372, 116), Sava's shrine (-384, 138), the old relay hut (-401, 196), the field at the Lauvel (-386, 183), the burned hamlet (-348, 212), Lumber Town (-408, 228), the Moros gate (-427, 259), the Legion camp (-549, 348) with its horse line, the border stockade and its battle ground (-368, 308) and (-392, 308) as one cluster, East Suval's border post (-224, 292), the waystation (-154, 328), Elod's gate (-28, 368.5), the bandit lookout, and the goblin camp, which is rigid about the point where its trail meets the main road (authored (-397, 153)) so the trail still starts at the road. Hex-derived anchors (`routeAnchors`) already scale plainly; where a cluster centre is such an anchor, use the anchor so the two agree exactly.
3. Keep literals **as authored numbers** and convert at the boundary, so diffs stay small and the design docs stay true: `point(...)`/`townPoint` and the literal tables in `src/region-world.js`, and the literals in `src/regional-life.js`, `src/regional-places.js`, `src/road-life.js`, `src/road-verges.js`, `src/road-audio.js`, `src/legion-posts.js`, `src/moros-chapter.js`, `src/border-chapter.js`, `src/forest-hideout.js`, `HIDEOUT_SITE`/`HIDEOUT_CLEARINGS`, `src/luscia-chapter.js`, `src/luscia-town.js`, `src/world-regions.js`, the non-village literals in `src/world.js`, and the handful in `src/main.js` (the Avrel raid trigger, the horse line, review cameras, test travel). Village-local modules (`forest-places`, `forest-hideout-world`, `woodland-life`, `forest-ecology`, `village-dog`, `economy`'s peddler stand, the landing Legion post) sit in the rigid village cluster and must come out unchanged: assert that in a test.
4. Roads: `MAIN_ROAD`, `SUVAL_ROAD`, `ONWARD_ROAD` and the regional paths: a vertex inside a cluster moves rigidly with it; other vertices scale plainly. Check no road segment now cuts through a building, an NPC stand or a collider near a cluster edge, and smooth where a rigid and a scaled vertex meet.

## Density, performance, feel

- Scatter is per hex: multiply `treesPerHex`/`rocksPerHex` by about k² so forests and stone fields keep their look. Keep instancing and district batching; keep frame time in the traversal smoke no worse than today's by more than about 20% (it records mean intervals per region). Terrain tiles: keep vertex spacing, add tiles.
- NPC culling (180 m), ecology culling, minimap radius and camera stay as they are. Wildlife and verge counts along roads should grow with road length.
- The mercenary company, the autopilot and the Legion posts follow the road by distance and need no tuning beyond their stops; check the company's stops still project onto the road.
- Encounter arenas (Greenway ambush, Avrel raid, the wolves, the goblin camp, the border battle) are rigid with their clusters; re-validate each config (`combat.startEncounter` rules: enemies within 12 across and -21..+18 along, before the retreat line).

## Saves

Add `worldScale: 100` to new checkpoints. A checkpoint without it was taken at 56 m: migrate its position with the cluster-aware `toWorld` before validating bounds, and keep everything else. `WORLD_BOUNDS` comes from `worldBoundsFor`.

## Tests and checks

- Update unit tests to derive expectations through `toWorld` (or from the modules) rather than new magic numbers; add `tests/world-scale.test.js` (round trips, cluster rigidity, village unchanged, anchors agree with `routeAnchors`, roads clear of colliders).
- `npm test` must pass throughout. At the end, run **once each** `npm run test:game`, `npm run test:road` and `npm run test:autoplay` (one at a time; raise their time limits for the longer road) and fix what they find, including anything left stale by the recent chapters (the goblin camp's smoke `src/forest-hideout-smoke.js` still describes the old Tidehaven flow: rewrite it for the Lumber Town garrison version or mark it clearly as needing that, and say which). Do not loop on smokes; the user wants development favoured over testing.
- Regenerate `src/region-survey.js` with `node scripts/build-region-survey.mjs` if its contents depend on scale.

## Out of scope

No new regions, towns, dialogue or signs: two other briefs cover West Suval with Solis and the towns-and-signs pass, and they start from your result. Do not touch `scripts/export-world-map.mjs` or `assets/`.

## Report

Write `docs/world-scale-report.md`: the scale chosen, the cluster table with authored and world centres, files touched, what the smokes found, frame-time comparison, and anything that now looks too sparse or too cramped and deserves the town pass's attention.
