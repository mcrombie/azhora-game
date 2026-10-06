# Alezhor handoff

Queue row 4 of the [completion ledger](../regional-completion-ledger.md), delivered by Claude on 4 October 2026: terrain, water, vegetation and wildlife only. The builders' brief is [`docs/alezhor-brief.md`](../alezhor-brief.md). With this delivery four regions wait for review (the Celder pair, East Izol, Alezhor), the plan's limit during the initial backlog: Claude writes briefs only until some are accepted.

## Revision

| | |
| --- | --- |
| Base | `fdc1707`, the East Izol delivery (on the Celder delivery, on `a2e49c3`) |
| Delivered | branch `alezhor`: `c042e86` (the build), then this report's commit, which also moves the falls view out from behind the gorge's rim |
| Worktree | `C:\Users\Michael\Programs\typescript\azhora-game-alezhor`, clean after both commits apart from the ignored `tests/artifacts/` |
| Not done | Not merged, not pushed. Runtime ID 64 is provisional. |

## Scope

| | Alezhor |
| --- | --- |
| Runtime ID | 64 |
| Atlas | 25 hexes, 13 grassland and 12 plains, all Csb |
| Neighbours | South Ibenwood 13 edges, West Ibenwood 10, Navarth 5, Ganesh Desert 3 (all built); South Ibenal 3 (unbuilt); the sea 22 |
| Arrival (F8) | (-4100, 870) |
| Landmarks on the chart | the falls of the gold river; the gold river's estuary; the flat at the gold river's mouth; the head of the bay; the tree line; the west stream's mouth; the western dunes; the southern cliffs; the bank of the Alezhor Water; the head of the gulf |

**New files**: `src/content/regions/alezhor/alezhor-world.js`, `src/content/regions/alezhor/alezhor-scenery.js`, `src/content/regions/alezhor/alezhor-wildlife.js`, `tests/alezhor-world.test.js`, `tests/alezhor-life.test.js`, `docs/alezhor-brief.md`, `docs/region-reviews/routes/alezhor-trails.json`, this report.

**Registration and wiring** (small, line-ending-preserving edits). Registration:
- `scripts/build-region-survey.mjs` (one more column, `WINDOW.minQ` -54) and the regenerated survey
- `src/world/terrain/region-layout.js`, `src/world/terrain/region-world.js`
- `src/dev/tools/developer-atlas.js`, `src/dev/tools/build-status.js` (`environment`), `src/gameplay/skills/languages.js` (`ibnael`, Forest Mittoli)
- `tests/test-manifest.json`

Wiring:
- `src/ui/map/map-fog.js` and `src/content/regions/western-regions/west-regions-life.js`.
- `src/world/terrain/world-terrain.js`: the outermost layer, `groundBeforeAlezhor`, tint and shore-tint rows.
- `src/main.js`: views; the `-wildlife` view frames an otter.
- `src/world.js`:
  - Alezhor's `regionBuild` step under its own label, "Alezhor".
  - A second step, `alezhorRiverGround`, lays both reaches on the forest's own two-metre river ground (`refineIbenwoodRiverGroundSteps` with `alezhorRiverIndex()`), as the Ibenwood's reaches are.
  - `alezhorMapWaters()` puts both on the chart.

Test knock-ons:
- `tests/region-layout.test.js`: the world-width budget is 68.8 hexes. Alezhor's coast moves the west edge out 50 m.
- `tests/developer-atlas.test.js`: the unbuilt example is now Maanub.
- The Alezhor probes in `tests/southwest-world.test.js`, and one guard line in `tests/selemis-world.test.js`.

**What is built**

- *Ground*: 216,000 m² of dry land, from 0.5 to 27.8 m.
  - **The plain** over the bay head stands at 3-6 m, in low swells. Over its last 72 m it rises to the forest's own level at the tree line, read live off the 23 tree-line edges.
  - **Folds**: two on the plain and two in the south.
  - **The south** is a narrow tilted strip, falling west from the Alezhor Water's bank (about 27 m) to cliffs of 6-12 m with two coves.
  - **The bay and the west lobe** are strand, with dunes behind the west lobe's beach.
- *The gold river* (84 m) begins exactly at the forest course's own end: 13.43 m, half-width 3.4, the same direction. It drops in three falls (3.3, 3.4 and 4.1 m) through three pools in a rock gorge, crosses a gravel ford 0.3-0.4 m deep, and ends in a 34 m estuary cut through the shore into the bay.
- *The west stream* (196 m) begins at West Ibenwood's end (13.47 m) and runs 8 m inside South Ibenal's line to the sea at the west lobe's corner.
- *The Alezhor Water* is not moved. Alezhor's bank sits at the water's level (+0.3 to 0.9 m) along all eight edges, with nothing standing in the water and no hole or cliff bank beside it.
- *Water in the world*: the scenery draws two ribbons and lays 143 river-water colliders. The pools and the stream are swum; the falls and the shallow ford are waded.
- *Kept flats*, nothing built:
  - the gold estuary's, 124 by 42 m at 3.25 m;
  - the west mouth's, 62 by 38 m at 3.0 m.

  Both are exported as reserved boxes.
- *Colour*: by plain, fold, strand, dune, gravel, gorge and bank, with a shore-tint row for the stone cliffs.
- *Places*: 10 landmarks, 4 trails (1.5 km), 10 views, 5 of them at walker's height, and `alezhor-wildlife`.
- *Scenery*: one seeded step-wise builder, reading the ground's own flats, folds, dunes and cover. 16,149 instances in 95 batches.

  | Kind | Count | Breakdown |
  | --- | ---: | --- |
  | Grass tufts | 9,344 | 2,314 bunch grass, 3,208 plains sward, 2,849 meadow, 669 sea turf, 304 marram |
  | Reed and rush | 215 | 138 reed, 77 rush |
  | Flowers | 632 | |
  | Shrubs | 1,114 | 302 gorse, 70 broom, 137 heather, 252 bramble, 353 bracken |
  | Stones | 160 | 14 of them boulders |
  | River gravel, driftwood | 366, 6 | |
  | Trees | 394 | 77 hawthorn, 62 white oak, 57 hazel, 42 holm oak, 36 chestnut, 25 alder, 18 bald cypress, 18 willow, 16 sycamore, 14 walnut, 12 beech, 10 stone pine, 7 juniper |

  - **Trees** are typed and harvestable. 128 of them stand at the tree line in the forest's own species.
  - **Blockers**: 457 in all. None stands on a trail, a landmark, a flat, or in a ground animal's range.
  - **Step costs**, measured in Node: median 0.3 ms, p99 1.4 ms, at most one step over 4 ms.
- *Wildlife*: 13 bands, 37 animals, no stock. Each band has its own layout, and a test holds it against every same-species band in the west.

  | Kind | Animals | Where |
  | --- | ---: | --- |
  | Forest edge-cat (Trogo's `forest-cat` rig, unchanged) | 4, in 2 bands | the gold-valley margin and West Ibenwood's line |
  | Red deer hinds | 4 | under West Ibenwood |
  | Upland hares | 7, in 2 bands | the open grass |
  | Harrier | 1 | over the coastal grassland |
  | Plateau hawk | 1 | over the tree line |
  | Gulls | 4 | the west lobe's beach |
  | Sea-plungers | 2 | off the southern cliffs |
  | Great river otters (scale 1.32) | 2 | the gold river's head pool |
  | Smaller otters | 3 | the west stream |
  | Herons | 3 | the sand spit at the gold mouth |
  | Black geese | 6 | a raft on the estuary's mouth |

**Not built** (owned): the gold cities at the river mouths, the gold workings in the forest valleys, the harbours, farms, roads and people.

**Builder choices to confirm or revise**

1. **The gold river falls.** The forest hands its river over at 13.4 m only half a hex from the sea, so it comes down in falls, a ford and a short estuary, and the bay is the "broad estuary".
2. The west stream runs 8 m inside South Ibenal's line. Its far bank rises up to about 9 m to meet the unbuilt South Ibenal as it stands.
3. There is no flat at the Alezhor Water's end: that water stops 42 m from the sea, at 9.4 m.
4. **Swimming.** The pools and the stream are swum; the falls and the ford are waded, except the ford's deep end, where the walk below swam 2.2 m.
5. No blend into the neighbours' ground along the forest lines: the rise to the trees is designed instead.
6. Default sky. Alezhor is not climbing terrain.
7. The cats keep open glades at the tree line, because no blocker stands in a range. The alternative is woodland residents among the edge trees, as Babon's boar are.
8. Otters may stand on banks up to slope 1.4 (everything else is held to 0.5), so they can reach the water to dive.
9. Extensions:
   - Black geese at a western river mouth, on the overview's north-south corridor.
   - Sea-plungers, deer, hares, harrier and herons.
   - Left out: boar, grey dolphins, the river fox and the pale deer.
10. Kept flats grow grass and flowers only. The woods are the designed folds, the tree-line edge band, the bank fringes and a few lone oaks and thorns. Deciduous trees lean north-west; holm oak and stone pine lean south-east.

**Lore edits.** Made in place under the user's standing rule. All three files were unmodified before; nothing was staged or committed in the World Builder repository.

| File | Old | New | Atlas fact |
| --- | --- | --- | --- |
| `alezhor.md` | "where the forest presses close to the cliffs" | "where the dry tableland of Navarth presses close to the cliffs" | The south borders Navarth and the Ganesh; the forest borders only the north. |
| `alezhor.md` | "and in the south it begins almost immediately" | "and at the mouth of the largest river it begins almost immediately" | South Ibenwood's hex (-30,115) comes within half a hex of the sea at the gold river's mouth. |
| `alezhor.md` | "approach Legemum's territory," | "approach the Ibenale," | The north-west end meets South Ibenal; Legemum is about 20 hexes south-east. |
| `alezhor.md` | "toward Legemum's territory." | "toward the Ibenale." | The same. |
| `ibenwood.md` | "past the latitude of Alezhor" | "as far as the latitude of Alezhor" | The forest's southernmost row is 116; Alezhor runs to 119. |
| `azhoran_flora_distribution.md` | "the Ibenwood's western edge" | "western and southern edges" | Alezhor lies along the forest's southern edge. |

**Language** (R6, not edited): Cape Heth's stand-in tongue could now become `ibnael`, the Alezhor coast's own; `cape_heth.md` ties the cape to this coast by language, and `src/gameplay/skills/languages.js` asks whoever builds Alezhor to revisit it.

## Border contract

`node scripts/region-evidence.mjs ../azhora-game-east-izol "Alezhor" --strip`, on `c042e86` (each step read a quarter of a metre either side of the line):

| Border | Edges | Worst step across the line (0.5 m apart) | Base there | Worst on the base |
| --- | ---: | --- | ---: | ---: |
| Alezhor, West Ibenwood (built) | 10 | 0.12 m at (-4350.3, 750.8), ground 21.4 | 0.73 m | 1.41 m |
| Alezhor, South Ibenwood (built) | 13 | 1.02 m at (-3950.3, 866.0), ground 13.8 | 1.02 m | 3.61 m |
| Alezhor, Navarth (built) | 5 | 0.43 m at (-3600.0, 1173.2), ground 25.4 | 0.33 m | 2.53 m |
| Alezhor, Ganesh Desert (built) | 3 | -1.11 m at (-3612.9, 1191.2), ground 21.4 | -1.32 m | 3.20 m |
| Alezhor, South Ibenal (unbuilt) | 3 | -0.20 m at (-4550.0, 866.5), ground 8.5 | -2.08 m | 2.08 m |

The builder's own seam tests probe 0.1 m across the line: West Ibenwood 0.000 m, South Ibenwood 0.048 m, Navarth 0.001 m, the Ganesh 0.18 m and South Ibenal 0.006 m. The far side never moved.

- **South Ibenwood**: the 1.02 m is the forest river's end corner, left as the base had it.
- **Navarth**: the 0.43 m is the bank's own slope.
- **The Ganesh**: the 1.11 m is the short bluff where Alezhor's bank comes down to the Ganesh floor, which lies 2.5-3.7 m below the water at (-3650, 1212.6).
- **The 46 m strips**: 531 one-metre steps are newly steep, none steeper than the base, and 16 were steep on the base already. They are the gold river's gorge and falls (the worst, 5.3 m in a metre at (-3948, 897), is a fall), the southern cliffs, the stream banks and the Alezhor Water's chute bank.
- **Coast**: 22 edges meet the sea.

**For R4 (Navarth, the Ganesh) and R10**:
- The Alezhor Water has no `blend`, so its channel steps by up to about 1.2 m at sample hand-overs on its chute.
- The Ganesh floor lies below the water at the gulf, as above.
- The Ganesh shore steps by about 0.9 m at its gulf corner.
- The Alezhor Water's head stands 2-3 m above South Ibenwood's ground.

Alezhor meets all of these live, so a correction on the far side carries through.

## Journey

`node scripts/walk-route.mjs docs/region-reviews/routes/alezhor-trails.json 64,34,35,39,41`. It walks with the game's own movement rules on a scoped world of Alezhor and its four built neighbours, with all their scenery and colliders.

The route:
1. From the arrival west along the length of the strip to the west stream's mouth.
2. Back east, out along the falls' rim and back, across the gold river by the ford and the estuary.
3. Past the southern cliffs to the head of the gulf.
4. Up the Alezhor Water's bank and back down.
5. West again to the tree line, and home.

Observed: walked 3,317 m and swam 2.2 m, at the gold river's crossing near the estuary. No steps round anything; blocked nowhere. Ground ran 0.3-27.5 m, and the steepest stretch walked was 39°. About 14 minutes at a walking pace.

**Not done**: a native keyboard walk.

## Evidence

| Check | Result |
| --- | --- |
| `alezhor-world` (includes a scoped world of 64, 34, 35, 39, 41), `alezhor-life` | 15/15, 13/13 (coordinator, on the final tree with the river ground and chart wiring) |
| `regional-build-steps`, `wildlife-loading`, `region-loading`, `ibenwood-rivers` | 3/3, 9/9, 7/7, 6/6 (coordinator, same tree) |
| `southwest-world`, `selemis-world`, `region-survey`, `region-sky`, `map-fog`, `ibenwood-boundary`, `nobody-sealed-in` | 34/34, 15/15, 4/4, 6/6, 7/7, 6/6, 6/6 (ground builder) |
| `region-layout`, `developer-atlas` | 8/8 each, after the width budget and the example moved |
| Known red, the same on `a2e49c3` | `languages` 15/16 ("East Ibenwood has no tongue"); `baldro-world` 6/7 ("a regional addition must not silently inflate the coast lattice": 3,306,420 on the base against its 3.3M budget, 3,329,028 with Alezhor); `local-map-data` 11/12 ("the chart includes the expanded authored cottages, farms, and barracks", the same on `fdc1707`, so not the new chart water); `izol-world` 8/9 (line 66) |

All of these ran on 4 October 2026, with at most four test processes at a time.

**Captures** (`tests/artifacts/` in the worktree above; native Electron, `--review-clean --review-size=1440x900`, 4 October 2026, revision `c042e86`):

| File | What it shows |
| --- | --- |
| `alezhor.png` | Overview from the sea: the Ibenwood's edge, the plain, and the gold river winding down into the bay |
| `alezhor-gold-falls.png` | Walker's height in the ford, looking up the gorge at the falls (retaken: the first eye had the gorge's west rim in the way, and was moved in this report's commit) |
| `alezhor-gold-estuary.png` | The river leaving its rock gorge into the bay, herons on the strand, the black geese's raft on the water |
| `alezhor-bay-head.png` | The head of the bay |
| `alezhor-tree-line.png` | Walker's height at the forest's edge: young trees, hazel and thorn in front of the forest |
| `alezhor-west-mouth.png` | The west stream's mouth, the dunes behind |
| `alezhor-dunes.png` | The western dunes |
| `alezhor-southern-cliffs.png` | From the sea: the cliffs and coves under the plain, the forest edge behind |
| `alezhor-water-bank.png` | Walker's height on the Alezhor Water's bank, the sea beyond |
| `alezhor-wildlife.png` | An otter at the stream, the forest edge behind |

The run reported no renderer errors (error count 0). Some steep triangles render near-white in direct light (the gorge walls, the cliffs), as on the West Lotharn and East Izol: that is the shared terrain renderer.

## Performance

| | Base `fdc1707` | With Alezhor (`c042e86`) |
| --- | ---: | ---: |
| Full start, cold (no terrain cache): total / ready | 134.0 s / 142.2 s | 133.2 s / 140.3 s |
| Full start, warm (terrain cache) | 105.0 s | 105.7 s |
| Longest stage | East Lotharn, 16.5 s | East Lotharn, 16.3 s |
| Wildlife groups | 741 | 754 |
| Errors | 0 | 0 |

`node scripts/launch.cjs --smoke-test --startup-profile --profile-warm`, with `--profile-root=../azhora-game-east-izol` for the base: one run each, back to back, on 4 October 2026, Full mode, offscreen 1440x960, with no other Electron process running. Results: `tests/artifacts/startup-base-fdc1707.json` and `startup-alezhor.json`.

Alezhor's build runs under its own label, `Alezhor`: 1.2 s cold and 1.3 s warm, including the river-ground pass. Every other stage moved by under 0.7 s either way.

**First touch.** In a cold Node process, the first call into Alezhor's ground costs 4 ms on the plain and about 50 ms near the gold river; later calls take about 11 us each.

**Not measured**: Fast mode in the renderer, frame times, renderer memory and draw calls.

## Persistence

- **Trees**: `worldTreeId('alezhor', x, z)`, from the country's own seeded stream; harvestable.
- **Wildlife**: 13 zones with fixed ids (`alezhor-gold-margin-cats` to `alezhor-estuary-geese`) and fixed sites. The species are all existing ones: `forest-cat`, `red-deer`, `upland-hare`, `harrier`, `plateau-hawk`, `gull`, `sea-plunger`, `otter`, `wading-bird`, `goose`.
- **Saves**: no migration. **Not done**: a native save, leave and reload.

## Next action

- **Review and integrate** (ChatGPT). The queue now holds four delivered regions, the plan's limit; Claude prepares briefs only until some are accepted.
- **For R4**: the Alezhor Water and Ganesh notes above.
- **For R6**: Cape Heth's tongue.
- **For the user**: builder choices 1-10, and the six lore edits (`git diff` in `world-builder`).

## Addendum: the stricter route walker

The East Izol intake found that `scripts/walk-route.mjs` kept the spawn height, always allowed swimming, nudged a
stuck walker 2 m forward, never failed a leg that ran out of steps, and always exited 0. It now:

- reads the colliders at the walker's real height (on the ground, or under the surface while swimming);
- never nudges, only steers round an obstacle at an angle;
- fails on any waypoint it cannot reach, and on any drop of more than a metre in one quarter-metre step (where the
  traveller controller would fall);
- reports every swim, with `--no-swim` turning a swim into a failure;
- exits 1 on any failure.

All three delivered routes pass it, 4 October 2026, on this commit:

| Route | Walked | Swam | Result |
| --- | ---: | --- | --- |
| `celder-loop.json` on 61, 62, 29, 28 | 2,100 m | 0 | passed, 13 steps round an obstacle |
| `east-izol-trails.json` on 63, 8 | 3,097 m | 0 | passed |
| `alezhor-trails.json` on 64, 34, 35, 39, 41 | 3,317 m | 2.2 m, across the ford | passed |

It is still screening only: the game's movement rules (`moveCharacter`, `canStand`, `canWalkSlope`) on a scoped world,
without the native controller's stamina, falling or swimming physics.
