# East Izol handoff

Queue row 3 of the [completion ledger](../regional-completion-ledger.md) (the ledger and the [joint plan](../regional-completion-joint-plan.md) are ChatGPT's). Delivered by Claude on 4 October 2026: terrain, water, vegetation and wildlife only. The brief both builders worked from is [`docs/east-izol-brief.md`](../east-izol-brief.md). This delivery also carries one Celder follow-up commit, answering the first concern of `celder-intake-review.md`.

## Revision

| | |
| --- | --- |
| Base | `136b582`, the frozen Celder delivery, itself on `a2e49c3` |
| Delivered | branch `east-izol`: `29ca691` (Celder follow-up, below), `0a47f26` (the East Izol build), then this report's commit |
| Worktree | `C:\Users\Michael\Programs\typescript\azhora-game-east-izol`, clean after the commits apart from the ignored `tests/artifacts/` |
| Not done | Not merged, not pushed. Runtime ID 63 is provisional: append centrally at integration. |

## The Celder follow-up (`29ca691`)

The intake's first concern was a cold first step near 1.5 s. Measured in Node: **the first call into South Celder's ground took 1,231 ms**, because `seamLines` read the step tables of all 47 border edges at once. The tables are now read edge by edge, the first time a point comes within reach of an edge. The worst first touch measured is **63 ms**, at the West Lotharn corner (-2060, -860) where two of its finely read edges meet. Elsewhere it is 0 to 13 ms.

The ground is **bit-identical**: the largest difference on 126,213 sampled points is 0.0. `south-celder-world` 8/8 and `north-celder-world` 6/6 pass after the change. The frozen revision `136b582` is untouched; this commit applies on top of it.

## Scope

| | East Izol |
| --- | --- |
| Runtime ID | 63 |
| Atlas | 27 hexes: 11 grassland, 8 plains, 4 hills, 3 forest, 1 mountain at (10,125). Csa 14 (north and east coast), Csb 13 (south-western interior) |
| Neighbours | West Izol (built, 10 edges); the sea (32 edges). No river on the atlas |
| Arrival (F8) | (500, 1934) |
| Landmarks on the chart | the central plain; the northern, eastern and southern Presence; the east bay; the wooded folds; the north arm; the east head; the south head |

**New files**:
- `src/content/regions/east-izol/east-izol-world.js`, `src/content/regions/east-izol/east-izol-scenery.js`, `src/content/regions/east-izol/east-izol-wildlife.js`
- `tests/east-izol-world.test.js`, `tests/east-izol-life.test.js`
- `docs/east-izol-brief.md`
- the evidence tools `scripts/walk-route.mjs` and `scripts/region-evidence.mjs`, with `docs/region-reviews/routes/celder-loop.json` and `east-izol-trails.json`
- this report

**Registration and wiring** (small, line-ending-preserving edits). Registration:
- `scripts/build-region-survey.mjs` and the regenerated `src/dev/tools/region-survey.js`
- `src/world/terrain/region-layout.js`, `src/world/terrain/region-world.js`
- `src/dev/tools/developer-atlas.js`, `src/dev/tools/build-status.js` (`environment`), `src/gameplay/skills/languages.js` (`izoli`)
- `tests/test-manifest.json`

Wiring:
- `src/world/terrain/world-terrain.js`: the outermost `eastIzolLayer`, `groundBeforeEastIzol`, tint and shore-tint rows.
- `src/world.js`: its `regionBuild` step under its own label, "East Izol".
- `src/ui/map/map-fog.js` and `src/content/regions/western-regions/west-regions-life.js`.
- `src/main.js`: views; the `-wildlife` view frames a gull colony.

Neighbour edits:
- `src/gameplay/movement/climbing.js`: East Izol by name.
- `src/content/regions/izol/izol-scenery.js`: two lines; West Izol's Presence props draw only where no ground stands at the peak, and the built world draws none.
- `tests/developer-atlas.test.js`: its unbuilt example moved from East Izol to Alezhor.
- `tests/selemis-world.test.js`: one guard line for the new shore-tint row.
- The East Izol probe in `tests/southwest-world.test.js`.

**What is built**

- *Ground*: 234,000 m² of land from 0.75 to 136 m. A central plain at 15-18 m on the plains hexes, where the Hearth Road ends. Hill crowns on the four hills hexes. The three forest hexes are sheltered folds, each with a dry gully.
- *The Three Presences*: West Izol's skyline props are now real ground, at each prop's apex and height.
  - **Northern**: a dome of 122 m on the mountain hex.
  - **Eastern**: a horn of 136 m with three arêtes.
  - **Southern**: a tilted block of 116 m with a sheer face toward the plain.
  - Each summit platform is level within 0.05 m, with nothing on it.
  - 60-90% of each flank is steeper than the climbing limit, and the lowest ground between any two is 16-22 m, so they read as three mountains, not a range.
  - Each has one walkable way up: the northern by its north-east ridge (worst gradient 0.69), the eastern by its eastern arête (0.73), the southern by its back from the south head (0.73).
- *Kept level, nothing built*:
  - **The Hearthstone's site**: (513, 1900), 15.6 m, radius 21 m. The road's end is on its western edge, it lies 211 m from the nearest shore, and all three Presences are in clear sight from it, as they are from the Sightstone.
  - **Merrath's flat**: (748, 1675), a box 96 by 140 m, 3-7 m above the water, at the head of the east bay behind a 57 m strand.
  - **A small flat** at the north-east bay, (664, 1482).
- *Coast*: about 68% cliff, with 7 pocket coves (5 shingle, 2 sand), 2 bays with strands, and a slope straight into the sea under the northern Presence. The waterline is the shared coast field's; nothing at sea moved.
- *Water*: no standing water. Five dry gullies with washed-stone beds: one runs to a cove, two to the bays' flats, two stop on clifftops above their coves.
- *Colour*: dark grey and iron-brown stone low, slate-grey high; pasture, maquis, darker folds, stone beds, greener flats; cliff faces, shingle and sand.
- *Scenery* (one seeded step-wise builder reading the ground module's own cover, gullies, coves and reserves):
  - about 5,490 grass tufts and 318 flowers;
  - shrubs: 730 garrigue, 511 maquis (16 of it oleander), 232 gorse;
  - 2,007 stones, among them 326 boulders with colliders, 74 outcrops and 1,104 scree;
  - shore shingle and gully cobbles;
  - 196 typed, harvestable trees: 65 stone pine, 103 holm oak, 8 juniper, 2 tamarisk, 18 hawthorn.

  About 14,200 instances in 51 batches and about 630 colliders. The build takes about 2.6 s, in steps under 4 ms.
- *Wildlife*: 13 ranges, 41 animals, no stock. Each band has its own layout, and a test holds each against every same-species band in the west.

  | Kind | Bands | Animals | Where |
  | --- | ---: | ---: | --- |
  | Gulls | 4 | 17 | the headland colonies |
  | Sea-plungers | 2 | 7 | off the north and east heads |
  | Grey dolphins | 2 | 5 | off the east bay and the south head |
  | Upland hares | 3 | 10 | in the gorse |
  | Plateau hawk | 1 | 1 | over the north arm |
  | Harrier | 1 | 1 | over the central plain |
- *Places*: 9 landmarks, 6 trails (2 km), 11 views, six of them at a walker's height, including `east-izol-from-the-sightstone` with all three peaks.

**Not built** (owned): Merrath, the shrines, the Hearthstone itself, the highland tribes and their flocks, and roads. The Hearth Road is West Izol's and was not extended.

**Builder choices to confirm or revise**

1. **Climbing terrain.** East Izol is in `CLIMB_REGIONS`. Without it a walker strolls straight up 70° faces. With it, each summit keeps one walkable way, and the principal journey, the coast path and the north-arm way stay walkable (worst gradient 0.86). To undo, remove the entry.
2. The peaks are narrower and steeper than the props. The props' 86-96 m half-widths reached into West Izol and over the Hearthstone's site.
3. Where the three kept places stand (above).
4. The coves can be reached on foot along the shared shore's strip, about 2 m wide, at the foot of the cliffs. Making the cliffs plunge into the water would move the waterline 1.5-3.5 m inland at the points, so it was not done.
5. Two Presences stand on plains hexes, (9,127) and (8,129), where West Izol put their props; the atlas has one mountain hex on Izol. The atlas could mark those two hexes mountain.
6. Animals left out: no wild goats (the only wild goat is the Oremindi snowgoat, kept to alpine ground, and a goat here reads as the tribes' stock); no boar (the woods are small pockets).
7. Small readings, not lore:
   - Hawk and harrier are extensions, as on the Ascarths.
   - Trees lean south-east, away from the channel wind.
   - West Izol's thorn is carried over as lone hawthorns, and common juniper stands in for a coastal juniper.
   - Oleander and rush grow on the gully banks; tamarisk at the gully ends and behind the sandy coves.
8. No tree stands within 6 m of the lines from the Hearthstone's site to the three summits ("where all three presences can witness it").

**Lore discrepancies** (the World Builder repository was not touched; proposed wording):

| Where | The lore says | Proposed |
| --- | --- | --- |
| `izol.md` | "Where rivers have cut their way to the sea and deposited the small alluvial flats ..." | "Where the winter's water has come down off the heights through the gullies of the interior and laid the small alluvial flats that make settlement comfortable, towns have grown. Izol has no river that runs the year round; through the dry summers its gullies are beds of washed stones." |
| `izol.md` | "another on a river mouth with agricultural flatland behind it" | "another at the mouth of a winter gully with the island's best flatland behind it" |
| `izol.md` | "rises progressively ... toward the island's central heights, where three peaks stand" (the atlas puts plains at the island's middle) | "rises from the coastal headlands toward three peaks standing round a central plain of pasture" |
| fauna overview, seabird sentence | — | "particularly along the Svaleen coast, the headlands of Izol across the channel, and the exposed Legemum headlands" |

## Border contract

`node scripts/region-evidence.mjs ../azhora-game-celder "East Izol" --strip`, on `0a47f26`:

| Border | Edges | Worst step across the line (0.5 m apart) | Base there | Worst on the base |
| --- | ---: | --- | ---: | ---: |
| East Izol, West Izol (built) | 10 | 0.25 m at (450.3, 1963.3), ground 13.5 | 4.54 m | 4.54 m |

- **West Izol.**
  - The 0.25 m is the ground's own fall across half a metre.
  - The builder's seam test reads 0.009 m at the line over 1,208 half-metre samples, and 7,947 sampled West Izol points did not move.
  - Two of West Izol's own hex-blend corner seams run about 1 m in from the line: up to 3.2 m at (400, 1876.5) and 0.3 m at (400, 1818.8). These are West Izol's, for R10.
- **Steepness.** Within 46 m of West Izol's line, 5,318 one-metre samples are steep, and none was steep on the base. They are the southern Presence's flank and the south head's cliffs, both authored. The worst, 9.1 m in a metre at (589, 2157), is the south head's cliff face.
- **Coast.** 32 edges meet the sea; the waterline is the shared field's.

## Journey

`node scripts/walk-route.mjs docs/region-reviews/routes/east-izol-trails.json 63,8`. It walks with the game's own `moveCharacter`, `canStand` and `canWalkSlope` (climbing terrain is in force) and the traveller's 0.34 m body, on a scoped world of East and West Izol with all their scenery and colliders.

The route follows the builders' trails:
1. From the arrival over the Hearthstone's site and the central plain to the east bay.
2. South along the coast, up the eastern arête to the eastern summit, and back down.
3. North along the coast to the north-east flat, over the north arm, up the north-east ridge to the northern summit, and back down.
4. Round the southern Presence's west side to the south head, up its back to the southern summit, and home.

Observed: walked 3,097 m. All three summits were reached by their walkable ways. Swam 0 m, needed no steps round anything, blocked nowhere. Ground ran 3.5-136 m, and the steepest stretch walked was 40°. About 13 minutes at a walking pace.

The Celder loop the intake asked for is committed too: `node scripts/walk-route.mjs docs/region-reviews/routes/celder-loop.json 61,62,29,28`.

**Not done**: a native keyboard walk of either route.

## Evidence

| Check | Result |
| --- | --- |
| `east-izol-world`, `east-izol-life` | 14/14, 12/12, on the final ground (builders' runs) |
| Neighbours and registration: `region-layout`, `region-survey`, `region-sky`, `map-fog`, `southwest-world`, `selemis-world`, `climbing`, `climbing-world`, `izol-people`, `nobody-sealed-in` | all pass (ground builder) |
| `developer-atlas`, `region-loading`, `loading-choice` | 8/8 and passing (coordinator, after the wiring) |
| `wildlife-loading`, `regional-build-steps` | 9/9, 3/3 (life builder) |
| Celder after `29ca691`: `south-celder-world`, `north-celder-world` | 8/8, 6/6 |
| Known red | `languages` 15/16 ("East Ibenwood has no tongue"); `izol-world` 8/9 (line 66 holds `WORLD_BOUNDS.maxX` between 600 and 620, red on `a2e49c3` too; for R10). Its Hearth Road and Presences tests pass. |

**Captures** (`tests/artifacts/` in the worktree above; native Electron, `--review-clean --review-size=1440x900`, 4 October 2026, revision `0a47f26`):

| File | What it shows |
| --- | --- |
| `east-izol.png` | Overview from the sea: the cliffed coast, its coves, the central plain and the three Presences |
| `east-izol-from-the-sightstone.png` | West Izol's road east from the Sightstone, with all three Presences in view: dome, horn and block |
| `east-izol-hearthstone-site.png` | Walker's height on the Hearthstone's site, between two Presences |
| `east-izol-the-gate.png` | Walker's height in the gap between two Presences |
| `east-izol-northern-shoulder.png` | Walker's height on the northern Presence's walkable ridge |
| `east-izol-summit.png` | From a summit, out to sea over the islets |
| `east-izol-north-arm.png` | The north arm's maquis under the northern dome |
| `east-izol-east-bay.png` | The east bay's strand under the pine slopes, Merrath's flat behind it |
| `east-izol-coast.png` | Headland cliffs and coves under the peaks |
| `east-izol-folds.png` | The wooded folds of stone pine and holm oak, the eastern horn behind |
| `east-izol-wildlife.png` | A gull over the east head's colony |

No renderer errors in the run (error count 0 throughout); Electron logged one GPU message while closing. No camera is inside the ground.

Seen in review and left for the reviewer:
- **Pale triangles.** Some steep or gully-side triangles render near-white in direct light. No colour in East Izol's palette is pale (the brightest is `dryPasture` `0xa3a272`), and the same pale quads appear on the West Lotharn's slopes in the Celder captures, so this looks like the shared terrain renderer on steep low-poly faces.
- **Coarse cliffs.** The cliff faces are coarse at the 7.1 m terrain mesh, as the ground builder warned.
- **Stones on the faces.** A few stones on the Presences' steep faces may stand off the coarse mesh.
- **Glare.** The northern-shoulder view faces the sun and shows a strong highlight on the slope.

## Performance

| | Base `136b582` | With East Izol (`0a47f26`) |
| --- | ---: | ---: |
| Full start, cold (no terrain cache): total / ready | 131.4 s / 140.3 s | 132.6 s / 139.9 s (+0.9%) |
| Full start, warm (terrain cache) | 101.2 s | 107.0 s (+5.7%) |
| Longest stage | East Lotharn, 17.5 s | East Lotharn, 16.6 s |
| Wildlife groups | 728 | 741 |
| Errors | 0 | 0 |

`node scripts/launch.cjs --smoke-test --startup-profile --profile-warm`, with `--profile-root=../azhora-game-celder` for the base: one run each, back to back, on 4 October 2026 on the user's Windows 10 machine (16 GB), Full mode, offscreen 1440x960, while no other Electron process ran. Results: `tests/artifacts/startup-base-136b582.json` and `startup-east-izol.json`.

**Where the time went.** East Izol's build runs under its own label, `East Izol`: 2.9 s cold and 2.8 s warm. Every other stage moved by under 1.2 s either way, within run-to-run noise. The same base took 136.1 s cold in the Celder run an hour earlier.

**First touch.** In a cold Node process, the first call into East Izol's ground takes 51 ms (the module's one-time warm-ups); later calls take 57 us each.

**Not measured**: Fast mode in the renderer (time to control, destination wait, slice times), frame times, renderer memory and draw calls.

## Persistence

- **Trees**: `worldTreeId('east-izol', x, z)`, from the country's own seeded stream; harvestable.
- **Wildlife**: 13 zones with fixed ids (`east-izol-east-head-gulls` to `east-izol-central-plain-harrier`) and fixed sites. The species are all existing: `gull`, `sea-plunger`, `dolphin`, `upland-hare`, `plateau-hawk`, `harrier`.
- **Saves**: no migration, since no save can hold East Izol state yet. **Not done**: a native save, leave and reload.

## Next action

- **Review and integrate** (ChatGPT). Take `29ca691` with or after the Celder pair.
- **For R10 (West Izol)**: the `izol-world` line-66 assertion; its corner seams near (400, 1876.5); the two-line props change in `src/content/regions/izol/izol-scenery.js`.
- **For the user**: builder choices 1-8, and the lore wording.
- **Next build**: Claude starts queue row 4, Alezhor, on top of this delivery. After it, four delivered regions will be waiting (the Celder pair, East Izol, Alezhor), the plan's limit during the initial backlog.
