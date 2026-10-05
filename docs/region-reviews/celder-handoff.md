# Celder handoff: South Celder and North Celder

Queue rows 1 and 2 of the [completion ledger](../regional-completion-ledger.md) (the ledger and the [joint plan](../regional-completion-joint-plan.md) are ChatGPT's, uncommitted in the main checkout when this was written). Delivered by Claude on 4 October 2026 as one two-region handoff: terrain, water, vegetation and wildlife only. The brief both builders worked from is [`docs/celder-brief.md`](../celder-brief.md).

## Revision

| | |
| --- | --- |
| Base | `a2e49c3` (main and origin/main when the work was cut, and still when it was delivered) |
| Delivered | branch `celder`: `e7012d9` (the build), then this report's commit, which also gives the Celder builds their own loading label and corrects a stale comment in `src/region-world.js` |
| Worktree | `C:\Users\Michael\Programs\typescript\azhora-game-celder`, clean after both commits apart from the ignored `tests/artifacts/` |
| Not done | Not merged into main, not pushed. Runtime IDs 61 and 62 are provisional: append them centrally at integration. |

## Scope

| | South Celder | North Celder |
| --- | --- | --- |
| Runtime ID | 61 | 62 |
| Atlas | 37 hexes, all plains; Dfa except Cfa at (-2,96) | 34 hexes, 26 plains and 8 grassland (the east); Dfa except Dfc at (-6,90) |
| Arrival (F8) | (-2450, -750.5) | (-2500, -1183.5) |
| Landmarks on the chart | The Celder water's head; the western foothills; the southern silt fans; the Lotharn's foot | The West Arm's Celder bank; the Celder water's bank; the northern silt fans; the western foothills; the open plain |

**New files**: `src/{south,north}-celder-world.js` (ground, water, colour, landmarks, views), `src/{south,north}-celder-scenery.js`, `src/{south,north}-celder-wildlife.js`, `tests/{south,north}-celder-world.test.js`, `tests/celder-life.test.js`, `docs/celder-brief.md`, this report.

**Registration and wiring** (small diffs, line endings preserved; 16 files, +96 -16): `scripts/build-region-survey.mjs` and the regenerated `src/region-survey.js`, `src/region-layout.js`, `src/region-world.js` (IDs, terrain and text rows), `src/developer-atlas.js`, `src/build-status.js` (state `environment`), `src/languages.js` (both speak `mittoli`), `src/map-fog.js`, `src/world.js` (two `regionBuild` steps, landmarks), `src/world-terrain.js` (an outermost `celderLayer`, `groundBeforeCelder` for seams, two tint rows), `src/west-regions-life.js` (zones, rendered footing), `src/main.js` (views; a Celder `-wildlife` view frames a frostback), `tests/test-manifest.json` (+3), and two neighbour corrections described under the border contract: `src/west-lotharn-world.js` and `tests/mithala-world.test.js`, plus the Celder probes in `tests/southwest-world.test.js`.

**What is built**

- *Ground*: one plain across both countries, written by one function (`celderLand`) so the shared line has no ridge or valley. It falls gently east (1 in 110) from the East Oremindi's foothills to the Mithala margin in three long low swells, up to about three metres either way; rounded foothills along the western border; four silt fans at the foothills' foot; stream terraces 1.3 m high, 50-88 m back from the water. The hex blend's steps are replaced by the seamless blend inside both countries.
- *Water*: the Mithala's two border streams (the West Arm and the Celder water, built as Mithala's own) now have a real Celder bank at their level: a floodplain a little over a metre above the water, then the terrace. Both are fast, cold, over gravel and wadeable. The atlas's one stream edge between the two Celders is built as a dry gravel bed, "The Celder water's head", falling to the head of the Celder water (builder choice 1).
- *Colour*: by plain, swell crest and hollow, terrace, stream bank, fan, foothill, stony ground and gravel.
- *Scenery*: one seeded builder for both (instanced; 30 and 28 batches). Grass tufts 8,986 / 8,636; forbs 531 / 461; scrub 183 / 145; stones 281 / 207 (boulders with colliders 107 / 99); gravel cobbles 88 / 279; sedge and rush 2 / 293. Trees 72 / 77, typed and harvestable through `registerWorldTree`: oak, birch, hawthorn, juniper and willow in the south; the same with black alder and white poplar in the north. Nothing that blocks a walker stands on a trail, within 5 m of a landmark, or inside an animal's range.
- *Wildlife*: 19 ranges, 58 animals, no stock and no horses. Frostback buffalo, the lore's wild bovid of the Celder plains: two herds in each country (7 + 5 in the south, 8 + 5 in the north) and 5 calves among them. The black soar-bird over each first herd; upland hares, a harrier and road foxes in both; a plateau hawk and four red deer hinds in the south-western foothills; three herons and three otters on North Celder's streams.

**Not built** (owned, and outside this work): the horse-lord houses, their herds and studs, the grooms and horse fairs, Canerd and its mound, the river-plain farms, the foothill quarries, roads and people. Canerd's mound site is kept level and open at (-2620, -1035), radius 110 m, in North Celder ("somewhere on the plain west of central Celder"), with no swell, fan or foothill on it and nothing named or built there.

**Builder choices to confirm or revise**

1. The head between the two Celders is a dry bed (spring snowmelt, no water surface). It could carry a stream instead.
2. Calves: separate frostback bands drawn at 0.62 scale. The lore does not mention them.
3. Stand-ins, no new rigs: the turkey-vulture rig for the black soar-bird, the road fox for a plains fox, white poplar for cottonwood (which has no timber entry). A curlew on the existing `wader()` rig would be the cheapest grassland bird to add.
4. No plains predators (hunt-hound pack, grass-lion, north wolf), as Mithala left them out.
5. Herds respond animal by animal (each faces the traveller and gives ground, the cattle response); there is no group-movement code.
6. Otters escape by running along the terrace: the Celder water is waded, not swum, so there is no deep water to dive into.
7. Landmark names are descriptive. Mittoli names (Celder speaks upper-plain Mittoli) are open.
8. The default sky.

**Lore discrepancy.** The lore runs the upper Lizeem "through the center of Celder"; the atlas has no river there. The atlas wins. The ground builder rewrote the two Lizeem paragraphs of `world-builder/azhora_lore/geography/regions/celder.md` in place (no great river crosses Celder; the plain's water gathers on its eastern margin), uncommitted in that repository, under the user's standing rule at the time. The joint plan, written after, keeps that repository read-only and asks for the discrepancy to be recorded here instead; whether that edit stays is the user's call. (That file's diff also has an "Under the Alliance" section that this work did not write.)

## Border contract

The step across every edge, read every half metre a quarter of a metre either side of the line (`groundWithRiver`, revision `e7012d9`):

| Border | Edges | Worst step across the line | Edge middle: ground 3 m inside / 3 m outside |
| --- | ---: | --- | --- |
| South Celder, West Lotharn Mountains (built) | 16 | 12.19 m at (-2050.0, -864.9), ground 87.9 | (-2250, -664): 41.4 / 46.8 |
| South Celder, Yunethre (built) | 8 | 0.77 m at (-2610.3, -542.4), ground 14.1 | (-2775, -534): 11.7 / 12.3 |
| South Celder, South Oremindi Mountains (built) | 4 | 0.07 m | (-2975, -621): 12.6 / 12.5 |
| South Celder, South Mithala (built) | 1 | 0.36 m | (-2125, -967): 26.7 / 27.7 |
| South Celder, East Oremindi Mountains (unbuilt) | 7 | 0.10 m | (-2850, -837): 10.9 / 10.9 |
| North Celder, West Mithala (built) | 12 | 0.13 m | (-2175, -1227): 12.6 / 12.6 |
| North Celder, South Mithala (built) | 6 | 0.12 m | (-2075, -1054): 11.6 / 11.6 |
| North Celder, Henborth (unbuilt) | 8 | 0.82 m at (-2461.6, -1392.2), ground 11.7 | (-2575, -1400): 8.3 / 7.7 |
| North Celder, East Oremindi Mountains (unbuilt) | 10 | 0.10 m | (-2825, -1227): 9.7 / 10.7 |

- **West Lotharn.** The 12.2 m is the range's cliff face crossing the line at a corner, rising about 38 m a metre on the far side; the base had 15.2 m there. Everywhere else the line meets within a few centimetres. The range's flank reaches 40-90 m onto South Celder's hexes, as it reached onto the outland before: `westLotharnShare` counts the two Celders as the outland they were (changed in this delivery; without it, registering them moved the range's own ground by up to 80.7 m and `west-lotharn-world` and `west-lotharn-peaks` failed). Within 45 m of the line, 19,031 one-metre samples of Celder ground are steeper than 45°, every one steep on the base too. The Celder layer adds 303, at worst 2.05 m in a metre, mostly where it eases the base's hex-edge steps into banks. **For R2:** if the range's foot should stand at the line, count the Celders as land in `westLotharnShare`, re-baseline the range's tests, and Celder's 90 m feather will shape the apron.
- **Yunethre, Henborth.** The 0.77 m and 0.82 m lie on those neighbours' own slopes (2-3 m a metre on the far side); the base had 2.5 m and 1.7 m hex-edge steps there.
- **Unbuilt neighbours** (East Oremindi, Henborth) are met as their outland stands. When either is built, its builder should take Celder's ground at the line as fixed.
- **Streams**: water surface and the ground 6 m either side, on the Celder reach:

  | Stream sample | Water | Ground 6 m either side |
  | --- | ---: | --- |
  | West Arm, (-2350, -1386), where it enters | 13.96 | 14.33 / 14.33 |
  | West Arm, (-2144, -1220) | 12.96 | 13.10 / 13.09 |
  | Celder water, (-2150, -981), its head | 12.32 | 12.77 / 12.37 |
  | Celder water, (-2106, -1061) | 12.10 | 12.63 / 12.64 |
  | Celder water, (-2003, -1077) | 11.55 | 11.96 / 11.98 |
  | Celder water, (-1952, -1154), where it leaves | 11.34 | 11.75 / 11.76 |

  The dry head falls to the Celder water's level, 12.32 m, at its foot.

- **Mithala** (`tests/mithala-world.test.js`): its "touches no other built country" table now expects the Celder edges (West Mithala 12 with North Celder; South Mithala 6 with North Celder, 1 with South Celder). Outside Celder, the West Arm's last two samples in West Mithala have banks 5 cm to 0.9 m *below* the water (around (-1859, -1153) and (-1700, -1414)): Mithala's own ground, for R8.

## Journey

A loop across both countries, 2.1 km, walked in Node with the game's own movement rules (`moveCharacter`, `canStand`, `canWalkSlope`, the traveller's 0.34 m body) on a scoped world of South and North Celder, West and South Mithala with all their scenery and colliders: South Celder arrival (-2450, -750.5) → southern silt fans (-2690, -850) → western foothills (-2815, -770) → over the shared line (-2700, -980) → the open plain (-2600, -1100) → the West Arm's Celder bank (-2142, -1206) → across the West Arm (-2146, -1233) and back → the Celder water's bank (-2060, -1110) → the Celder water's head (-2160, -938) → the Lotharn's foot (-2265, -705) → the arrival. Normal walking, no climbing skill and no stamina use beyond walking; outside climbing terrain the walking rules accept any slope.

Observed: walked 2,099 m, swam 0 m (the West Arm is waded both ways), stepped round a boulder or tree 11 times, blocked nowhere; ground 11.7-27.4 m. About nine minutes at a walking pace. **Not done**: a native keyboard walk of the same loop in the Electron build.

## Evidence

| Check | Command | Result |
| --- | --- | --- |
| Celder ground | `node scripts/run-tests.cjs tests/south-celder-world.test.js tests/north-celder-world.test.js` | pass 8/8, 6/6 |
| Celder life (west laws per range, scenery) | `tests/celder-life.test.js` | pass 9/9 (415 s) |
| Neighbours | `mithala-world`, `west-lotharn-world`, `yunethre-world`, `southwest-world` (tint guard), `west-rivers`, `nobody-sealed-in` | pass 14/14, 10/10, 8/8, 34/34, 5/5, 6/6 |
| Registration | `region-layout`, `region-sky`, `region-survey`, `wildlife-loading`, `regional-build-steps` | pass 8/8, 6/6, 4/4, 9/9, 3/3 |
| Known red on main | `languages` | 15/16: "East Ibenwood has no tongue", the same failure as `a2e49c3` |

All on revision `e7012d9`, 4 October 2026, run four processes at a time (6.9 min).

**Captures** (`tests/artifacts/` in the worktree above; native Electron, `--review-clean --review-size=1440x900`, 4 October 2026):

| File | What it shows |
| --- | --- |
| `south-celder.png` | Overview over the south-eastern swells, west across the plain (retaken: the first eye was inside the West Lotharn's flank) |
| `south-celder-swells.png` | Walker's height on the middle swells, west over the fans to the foothills and the South Oremindi |
| `south-celder-foothills.png` | The western foothills' gentle rises; the South Oremindi to the south-west |
| `south-celder-head.png` | The dry gravel head running into the Celder water, the West Lotharn's apron on the right |
| `south-celder-lotharn-foot.png` | The plain rising through a grass apron to the West Lotharn's ledged cliff wall |
| `south-celder-wildlife.png` | A frostback herd with calves on the swells |
| `north-celder.png` | Overview of the northern swells, the West Arm in the corner |
| `north-celder-open-plain.png` | Walker's height on the open plain where Canerd's mound would stand |
| `north-celder-west-arm.png` | The West Arm through the terrace grass, poplars and birch, a heron on the bank |
| `north-celder-celder-water.png` | The Celder water in its grassy valley under the West Lotharn's northern end |
| `north-celder-foothills.png` | The northern foothills and fans |
| `north-celder-shared-line.png` | South across the line between the two Celders: one plain, no step |
| `north-celder-wildlife.png` | The terrace herd |

Seen in review and left for the reviewer: the four herds' spawn sites follow nearly one pattern, so the two herd views look alike (they wander in play); a few flat white quads show on the West Lotharn's slopes in `north-celder-celder-water.png` and `north-celder-shared-line.png`, on the range's side of the line. No renderer errors in the run (13 views, error count 0); Electron logged one GPU message while closing.

## Performance

| | Base `a2e49c3` | With Celder (`e7012d9`) |
| --- | ---: | ---: |
| Full start, cold (no terrain cache): total / ready | 124.5 s / 131.6 s | 136.1 s / 144.5 s (+9.3%) |
| Full start, warm (terrain cache) | 113.0 s | 108.4 s |
| Longest stage | East Lotharn, 17.6 s | East Lotharn, 17.5 s |
| Wildlife groups | 709 | 728 |
| Errors | 0 | 0 |

`node scripts/launch.cjs --smoke-test --startup-profile --profile-warm`, with `--profile-root=../azhora-game-land` for the base: one run each, back to back, on 4 October 2026 on the user's Windows 10 machine (16 GB), Full loading mode (the default), offscreen 1440x960. Results: `tests/artifacts/startup-base-a2e49c3.json` and `startup-celder.json` in the Celder worktree.

Where the time went: Celder's two scenery builds ran under Telemonia's `Kethorn` stage label, having none of their own, and that stage grew from 10.2 to 14.5 s cold and from 12.2 to 16.9 s warm: about 4.5 s, Celder's whole build. The rest of the cold difference is spread thinly and within run-to-run noise (the warm runs went the other way by 4.6 s). The builds now announce themselves as `The Celder plains` (this report's commit), so the loader no longer says Kethorn while it builds them. In Node their steps yield every 7-28 ms after a first step of about 1.5 s in a cold process (the shared terrain code warming up). The cold increase is under the plan's 10% investigation threshold, but close to it, on single runs. **Not measured**: Fast mode (time to control, destination wait, slice times in the renderer), frame times, renderer memory and draw calls.

## Persistence

- Trees: `worldTreeId(country, x, z)` ids, from each country's own seeded stream; harvestable.
- Wildlife: 19 zones with fixed ids (`south-celder-swell-buffalo` to `north-celder-fox`) and fixed sites; species `frostback`, `turkey-vulture`, `upland-hare`, `harrier`, `plateau-hawk`, `red-deer`, `road-fox`, `wading-bird` (the herons) and `otter`, all existing ones.
- No save migration: no save can hold Celder state yet. **Not done**: a native save, leave and reload with a cut tree and a defeated animal.

## Next action

- Review and integrate (ChatGPT). Nothing in this delivery changes an existing region's ground: the West Lotharn change keeps its ground as it was, and Mithala's streams are untouched (`tests/south-celder-world.test.js`, "the Mithala's border water is untouched").
- Open for the user: builder choices 1-8 and the lore edit above.
- For R2 (West Lotharn): the range's Celder-facing flank, above.
- For R8 (Mithala): the West Arm's low banks in West Mithala, above.
- For Henborth and the East Oremindi (queue 7 and 8): meet Celder's ground at the line; the Celder side is shaped against their outland now.
